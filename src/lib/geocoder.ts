/**
 * Geocoding service — swappable provider architecture.
 *
 * Current provider: OpenStreetMap Nominatim (free, 1 req/sec).
 * To swap to Mapbox or Google, implement the `GeocoderProvider` interface
 * and pass it to `createGeocoder()`.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeocodedResult {
  lat: number;
  lng: number;
  displayName: string;
  /** 0–1 score: 1 = perfect match */
  confidence: number;
  source: "nominatim" | "mapbox" | "google" | "ai" | "none";
}

export interface GeocodeQuery {
  /** e.g. "Prem Mandir" */
  stopTitle: string;
  /** e.g. "Vrindavan" */
  stopLocation: string;
  /** Trip-level destination city, e.g. "Vrindavan & Agra" */
  destinationCity: string;
  /** Trip-level country, e.g. "India" */
  country: string;
}

export interface GeocoderProvider {
  name: string;
  geocode(query: string): Promise<NominatimRaw[]>;
}

interface NominatimRaw {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  importance?: number;
}

// ─── Haversine ───────────────────────────────────────────────────────────────

/** Distance in km between two lat/lng pairs */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Nominatim provider ──────────────────────────────────────────────────────

const nominatimProvider: GeocoderProvider = {
  name: "nominatim",
  async geocode(query: string): Promise<NominatimRaw[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TeraVue-TripPlanner/1.0 (contact@teravue.app)" },
    });
    if (!res.ok) return [];
    return res.json();
  },
};

// ─── Confidence scoring ──────────────────────────────────────────────────────

function scoreResult(
  result: NominatimRaw,
  query: GeocodeQuery,
  cityCenter: { lat: number; lng: number } | null
): number {
  const dn = result.display_name.toLowerCase();
  let score = result.importance ?? 0.3; // Nominatim importance as base (0–1)

  // Boost: stop title appears in display_name
  const titleWords = query.stopTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const titleMatches = titleWords.filter(w => dn.includes(w)).length;
  if (titleWords.length > 0) {
    score += 0.2 * (titleMatches / titleWords.length);
  }

  // Boost: location name appears
  if (query.stopLocation && dn.includes(query.stopLocation.toLowerCase())) {
    score += 0.15;
  }

  // Boost: country appears
  if (query.country && dn.includes(query.country.toLowerCase())) {
    score += 0.1;
  }

  // Penalty: too far from city center (if known)
  if (cityCenter) {
    const dist = haversineKm(
      cityCenter.lat, cityCenter.lng,
      parseFloat(result.lat), parseFloat(result.lon)
    );
    if (dist > 500) score -= 0.4;
    else if (dist > 200) score -= 0.25;
    else if (dist > 50) score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

// ─── Main geocoder ───────────────────────────────────────────────────────────

/** Minimum confidence to accept a geocoded result */
const MIN_CONFIDENCE = 0.25;

/** Max distance (km) from city center before we consider AI coords "wrong" */
const MAX_CITY_DISTANCE_KM = 300;

/** Activity types that represent real places worth geocoding */
const GEOCODABLE_TYPES = new Set([
  "activity", "restaurant", "hotel", "temple", "museum",
  "monument", "park", "shopping", "attraction", "landmark",
  "market", "beach", "cafe", undefined, "", // default/unset
]);

/** Types that should NOT be geocoded */
const SKIP_GEOCODE_TYPES = new Set(["train", "airport", "flight", "transport"]);

export interface GeocoderOptions {
  provider?: GeocoderProvider;
}

export function createGeocoder(opts?: GeocoderOptions) {
  const provider = opts?.provider ?? nominatimProvider;

  /** Cache city centers to avoid repeated lookups */
  const cityCenterCache = new Map<string, { lat: number; lng: number } | null>();

  async function getCityCenter(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
    const key = `${city}|${country}`.toLowerCase();
    if (cityCenterCache.has(key)) return cityCenterCache.get(key)!;

    const results = await provider.geocode(`${city}, ${country}`);
    if (results.length > 0) {
      const center = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      if (Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        cityCenterCache.set(key, center);
        return center;
      }
    }
    cityCenterCache.set(key, null);
    return null;
  }

  /**
   * Validate existing AI coords against the trip's city center.
   * Returns true if coords look reasonable.
   */
  function areAICoordsReasonable(
    lat: number, lng: number,
    cityCenter: { lat: number; lng: number } | null
  ): boolean {
    // Out of bounds
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;

    // If we have a city center, check distance
    if (cityCenter) {
      const dist = haversineKm(lat, lng, cityCenter.lat, cityCenter.lng);
      if (dist > MAX_CITY_DISTANCE_KM) {
        console.warn(`[geocoder] AI coords (${lat},${lng}) are ${dist.toFixed(0)}km from city center — will re-geocode`);
        return false;
      }
    }

    return true;
  }

  /**
   * Geocode a single stop.
   * Returns corrected coords + metadata, or null if geocoding fails/skipped.
   */
  async function geocodeStop(
    query: GeocodeQuery,
    existingLat?: number | null,
    existingLng?: number | null,
    activityType?: string
  ): Promise<GeocodedResult | null> {
    // Skip non-geocodable types (trains, flights, etc.)
    if (activityType && SKIP_GEOCODE_TYPES.has(activityType)) {
      return null;
    }

    // Get city center for distance validation
    const cityCenter = await getCityCenter(query.destinationCity, query.country);

    // Check if AI coords are already reasonable
    if (
      existingLat != null && existingLng != null &&
      Number.isFinite(existingLat) && Number.isFinite(existingLng)
    ) {
      // Try swap fix first
      let lat = existingLat;
      let lng = existingLng;
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        console.log(`[geocoder] Swapping lat/lng: (${lat},${lng}) → (${lng},${lat})`);
        [lat, lng] = [lng, lat];
      }

      if (areAICoordsReasonable(lat, lng, cityCenter)) {
        return {
          lat, lng,
          displayName: "",
          confidence: 0.5, // AI-provided, passed validation
          source: "ai",
        };
      }
    }

    // Build geocode query — combine all context for best results
    const parts = [
      query.stopTitle,
      query.stopLocation,
      query.destinationCity,
      query.country,
    ].filter(Boolean);

    // Deduplicate words for cleaner query
    const seen = new Set<string>();
    const dedupedParts = parts.filter(p => {
      const lower = p.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    const searchQuery = dedupedParts.join(", ");
    if (!searchQuery.trim()) return null;

    try {
      const results = await provider.geocode(searchQuery);
      if (results.length === 0) {
        // Retry with just title + country (less specific)
        const fallbackQuery = `${query.stopTitle}, ${query.country}`;
        const fallbackResults = await provider.geocode(fallbackQuery);
        if (fallbackResults.length === 0) return null;
        return pickBest(fallbackResults, query, cityCenter);
      }
      return pickBest(results, query, cityCenter);
    } catch (err) {
      console.warn(`[geocoder] Failed for "${searchQuery}":`, err);
      return null;
    }
  }

  function pickBest(
    results: NominatimRaw[],
    query: GeocodeQuery,
    cityCenter: { lat: number; lng: number } | null
  ): GeocodedResult | null {
    const scored = results.map(r => ({
      result: r,
      score: scoreResult(r, query, cityCenter),
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score < MIN_CONFIDENCE) {
      console.log(`[geocoder] Low confidence (${best?.score.toFixed(2)}) for "${query.stopTitle}" — skipping`);
      return null;
    }

    const lat = parseFloat(best.result.lat);
    const lng = parseFloat(best.result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      lat,
      lng,
      displayName: best.result.display_name,
      confidence: best.score,
      source: "nominatim" as const,
    };
  }

  return { geocodeStop, getCityCenter };
}

/** Default geocoder instance using Nominatim */
export const geocoder = createGeocoder();
