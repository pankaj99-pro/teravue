/**
 * High-precision geocoding service with LocationIQ primary + Nominatim fallback.
 *
 * Architecture:
 *  1. LocationIQ (via edge function) — primary, high-accuracy
 *  2. Nominatim (direct) — fallback, free
 *
 * Multi-layer validation:
 *  - Name validation (token similarity)
 *  - Geographic validation (city/state/country)
 *  - Type validation (tourism, place_of_worship, etc.)
 *  - Importance threshold
 *  - Distance from city center
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeocodedResult {
  lat: number;
  lng: number;
  displayName: string;
  /** 0–1 score: 1 = perfect match */
  confidence: number;
  source: "locationiq" | "nominatim" | "ai" | "none";
}

export interface GeocodeQuery {
  stopTitle: string;
  stopLocation: string;
  destinationCity: string;
  country: string;
}

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    county?: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_CONFIDENCE = 0.30;
const MAX_CITY_DISTANCE_KM = 300;
const IMPORTANCE_THRESHOLD = 0.35;

/** Accepted place types */
const VALID_TYPES = new Set([
  "tourism", "place_of_worship", "attraction", "landmark", "museum",
  "monument", "temple", "park", "garden", "archaeological_site",
  "viewpoint", "artwork", "gallery", "zoo", "aquarium", "theme_park",
  "amenity", "building", "shop", "leisure", "historic",
]);

/** Accepted classes */
const VALID_CLASSES = new Set([
  "tourism", "amenity", "building", "shop", "leisure", "historic",
  "place", "natural", "highway", // highway for named ghats/paths
]);

/** Types to skip geocoding entirely */
const SKIP_GEOCODE_TYPES = new Set(["train", "airport", "flight", "transport"]);

// ─── Haversine ───────────────────────────────────────────────────────────────

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

// ─── Token Similarity ────────────────────────────────────────────────────────

function tokenSimilarity(query: string, result: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1);
  const queryTokens = normalize(query);
  const resultTokens = new Set(normalize(result));
  if (queryTokens.length === 0) return 0;
  const matches = queryTokens.filter(t => resultTokens.has(t)).length;
  return matches / queryTokens.length;
}

// ─── Validation Engine ───────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  score: number;
  reason?: string;
}

function validateResult(
  result: GeoResult,
  query: GeocodeQuery,
  cityCenter: { lat: number; lng: number } | null
): ValidationResult {
  const dn = result.display_name.toLowerCase();
  let score = result.importance ?? 0.3;
  const reasons: string[] = [];

  // 1. NAME VALIDATION — token similarity
  const nameSim = tokenSimilarity(query.stopTitle, result.display_name);
  if (nameSim >= 0.8) {
    score += 0.25;
  } else if (nameSim >= 0.5) {
    score += 0.15;
  } else if (nameSim < 0.3) {
    // Check if title words appear individually
    const titleWords = query.stopTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const foundCount = titleWords.filter(w => dn.includes(w)).length;
    if (titleWords.length > 0 && foundCount / titleWords.length < 0.5) {
      reasons.push(`name_mismatch(sim=${nameSim.toFixed(2)})`);
      score -= 0.15;
    }
  }

  // 2. GEOGRAPHIC VALIDATION — city/state/country
  const addr = result.address;
  if (addr) {
    const resultCity = (addr.city || addr.town || addr.village || "").toLowerCase();
    const resultState = (addr.state || "").toLowerCase();
    const resultCountry = (addr.country || "").toLowerCase();
    const expectedCity = query.destinationCity.toLowerCase().split(/[&,]/)[0].trim();
    const expectedCountry = query.country.toLowerCase();

    if (resultCountry && resultCountry.includes(expectedCountry)) {
      score += 0.1;
    } else if (expectedCountry && !dn.includes(expectedCountry)) {
      reasons.push("wrong_country");
      score -= 0.3;
    }

    if (resultCity && (resultCity.includes(expectedCity) || expectedCity.includes(resultCity))) {
      score += 0.15;
    } else if (resultState && dn.includes(expectedCity)) {
      score += 0.1;
    }
  } else {
    // No address details — use display_name
    if (query.country && dn.includes(query.country.toLowerCase())) score += 0.1;
    if (query.destinationCity) {
      const city = query.destinationCity.toLowerCase().split(/[&,]/)[0].trim();
      if (dn.includes(city)) score += 0.15;
    }
  }

  // 3. TYPE VALIDATION
  const rType = (result.type || "").toLowerCase();
  const rClass = (result.class || "").toLowerCase();
  if (VALID_TYPES.has(rType) || VALID_CLASSES.has(rClass)) {
    score += 0.05;
  } else if (rType === "residential" || rType === "road" || rType === "village") {
    reasons.push(`bad_type(${rType})`);
    score -= 0.2;
  }

  // 4. IMPORTANCE THRESHOLD
  if ((result.importance ?? 0) < IMPORTANCE_THRESHOLD) {
    score -= 0.05;
  }

  // 5. DISTANCE FROM CITY CENTER
  if (cityCenter) {
    const dist = haversineKm(
      cityCenter.lat, cityCenter.lng,
      parseFloat(result.lat), parseFloat(result.lon)
    );
    if (dist > 500) {
      reasons.push(`too_far(${dist.toFixed(0)}km)`);
      score -= 0.4;
    } else if (dist > 200) {
      score -= 0.25;
    } else if (dist > 50) {
      score -= 0.1;
    } else if (dist < 20) {
      score += 0.1; // Close to city = bonus
    }
  }

  score = Math.max(0, Math.min(1, score));

  return {
    valid: score >= MIN_CONFIDENCE && reasons.filter(r => r.startsWith("wrong_")).length === 0,
    score,
    reason: reasons.length > 0 ? reasons.join(", ") : undefined,
  };
}

// ─── Providers ───────────────────────────────────────────────────────────────

async function queryLocationIQ(query: string): Promise<GeoResult[]> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) {
      console.warn("[geocoder] No VITE_SUPABASE_PROJECT_ID — skipping LocationIQ");
      return [];
    }

    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { query },
    });

    if (error) {
      console.warn("[geocoder] LocationIQ edge function error:", error);
      return [];
    }

    return data?.results || [];
  } catch (err) {
    console.warn("[geocoder] LocationIQ call failed:", err);
    return [];
  }
}

async function queryNominatim(query: string): Promise<GeoResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TeraVue-TripPlanner/1.0 (contact@teravue.app)" },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

const geocodeCache = new Map<string, GeocodedResult>();

// ─── City center cache ───────────────────────────────────────────────────────

const cityCenterCache = new Map<string, { lat: number; lng: number } | null>();

async function getCityCenter(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  const key = `${city}|${country}`.toLowerCase();
  if (cityCenterCache.has(key)) return cityCenterCache.get(key)!;

  // Try LocationIQ first, then Nominatim
  const cityQuery = `${city}, ${country}`;
  let results = await queryLocationIQ(cityQuery);
  if (results.length === 0) {
    results = await queryNominatim(cityQuery);
  }

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

// ─── AI Coord Validation ─────────────────────────────────────────────────────

function areAICoordsReasonable(
  lat: number, lng: number,
  cityCenter: { lat: number; lng: number } | null
): boolean {
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (cityCenter) {
    const dist = haversineKm(lat, lng, cityCenter.lat, cityCenter.lng);
    if (dist > MAX_CITY_DISTANCE_KM) {
      console.warn(`[geocoder] AI coords (${lat},${lng}) are ${dist.toFixed(0)}km from city center — will re-geocode`);
      return false;
    }
  }
  return true;
}

// ─── Input Normalization ─────────────────────────────────────────────────────

function normalizeInput(query: GeocodeQuery): string[] {
  const { stopTitle, stopLocation, destinationCity, country } = query;

  // Build multiple query variants (most specific → least specific)
  const parts = [stopTitle, stopLocation, destinationCity, country].filter(Boolean);

  // Deduplicate
  const seen = new Set<string>();
  const deduped = parts.filter(p => {
    const lower = p.toLowerCase().trim();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  const fullQuery = deduped.join(", ");
  const titleCityCountry = [stopTitle, destinationCity, country].filter(Boolean);
  const titleCountry = [stopTitle, country].filter(Boolean);

  // Return queries in priority order
  return [
    fullQuery,
    titleCityCountry.join(", "),
    titleCountry.join(", "),
  ].filter((q, i, arr) => arr.indexOf(q) === i); // unique
}

// ─── Pick Best Result ────────────────────────────────────────────────────────

function pickBest(
  results: GeoResult[],
  query: GeocodeQuery,
  cityCenter: { lat: number; lng: number } | null,
  source: "locationiq" | "nominatim"
): GeocodedResult | null {
  const scored = results.map(r => {
    const v = validateResult(r, query, cityCenter);
    return { result: r, ...v };
  });

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score);

  // Log validation details
  scored.slice(0, 3).forEach((s, i) => {
    console.log(
      `[geocoder] ${source} #${i + 1}: "${s.result.display_name.slice(0, 60)}" | ` +
      `score=${s.score.toFixed(2)} valid=${s.valid} ${s.reason ? `(${s.reason})` : ""}`
    );
  });

  const best = scored[0];
  if (!best || !best.valid || best.score < MIN_CONFIDENCE) {
    return null;
  }

  // Ambiguity check: if top 2 have same score but different locations, reject
  if (scored.length >= 2 && scored[1].valid) {
    const dist = haversineKm(
      parseFloat(scored[0].result.lat), parseFloat(scored[0].result.lon),
      parseFloat(scored[1].result.lat), parseFloat(scored[1].result.lon)
    );
    if (Math.abs(scored[0].score - scored[1].score) < 0.05 && dist > 50) {
      console.warn(`[geocoder] Ambiguous results for "${query.stopTitle}" — top 2 are ${dist.toFixed(0)}km apart`);
      // Still use the top result but lower confidence
      return {
        lat: parseFloat(best.result.lat),
        lng: parseFloat(best.result.lon),
        displayName: best.result.display_name,
        confidence: best.score * 0.8,
        source,
      };
    }
  }

  const lat = parseFloat(best.result.lat);
  const lng = parseFloat(best.result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: best.result.display_name, confidence: best.score, source };
}

// ─── Main Geocoder ───────────────────────────────────────────────────────────

async function geocodeStop(
  query: GeocodeQuery,
  existingLat?: number | null,
  existingLng?: number | null,
  activityType?: string
): Promise<GeocodedResult | null> {
  // Skip non-geocodable types
  if (activityType && SKIP_GEOCODE_TYPES.has(activityType)) {
    return null;
  }

  // Check cache
  const cacheKey = `${query.stopTitle}|${query.stopLocation}|${query.destinationCity}`.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    console.log(`[geocoder] Cache hit for "${query.stopTitle}"`);
    return geocodeCache.get(cacheKey)!;
  }

  // Get city center
  const cityCenter = await getCityCenter(query.destinationCity, query.country);

  // Check if existing AI coords are reasonable
  if (
    existingLat != null && existingLng != null &&
    Number.isFinite(existingLat) && Number.isFinite(existingLng)
  ) {
    let lat = existingLat;
    let lng = existingLng;
    // Swap fix
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      console.log(`[geocoder] Swapping lat/lng: (${lat},${lng}) → (${lng},${lat})`);
      [lat, lng] = [lng, lat];
    }

    if (areAICoordsReasonable(lat, lng, cityCenter)) {
      // AI coords pass basic validation — but still try to get better coords
      // Only skip geocoding if we're confident the AI coords are precise
      // For now, always try to improve with real geocoding
    }
  }

  // Build normalized queries
  const queries = normalizeInput(query);

  // STEP 1: Try LocationIQ (primary)
  for (const q of queries) {
    const results = await queryLocationIQ(q);
    if (results.length > 0) {
      const best = pickBest(results, query, cityCenter, "locationiq");
      if (best && best.confidence >= MIN_CONFIDENCE) {
        console.log(
          `[geocoder] ✅ LocationIQ resolved "${query.stopTitle}" → (${best.lat},${best.lng}) [conf=${best.confidence.toFixed(2)}]`
        );
        geocodeCache.set(cacheKey, best);
        return best;
      }
    }
  }

  // STEP 2: Fallback to Nominatim
  console.log(`[geocoder] LocationIQ miss — falling back to Nominatim for "${query.stopTitle}"`);
  for (const q of queries) {
    const results = await queryNominatim(q);
    if (results.length > 0) {
      const best = pickBest(results, query, cityCenter, "nominatim");
      if (best && best.confidence >= MIN_CONFIDENCE) {
        console.log(
          `[geocoder] ✅ Nominatim resolved "${query.stopTitle}" → (${best.lat},${best.lng}) [conf=${best.confidence.toFixed(2)}]`
        );
        geocodeCache.set(cacheKey, best);
        return best;
      }
    }
    // Rate limit Nominatim
    await new Promise(r => setTimeout(r, 1100));
  }

  // STEP 3: If all geocoding failed, check if AI coords are at least passable
  if (
    existingLat != null && existingLng != null &&
    Number.isFinite(existingLat) && Number.isFinite(existingLng)
  ) {
    let lat = existingLat;
    let lng = existingLng;
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];

    if (areAICoordsReasonable(lat, lng, cityCenter)) {
      console.warn(`[geocoder] ⚠️ Using AI coords for "${query.stopTitle}" — geocoding failed`);
      return { lat, lng, displayName: "", confidence: 0.3, source: "ai" };
    }
  }

  console.warn(`[geocoder] ❌ No valid coords for "${query.stopTitle}"`);
  return null;
}

export const geocoder = { geocodeStop, getCityCenter };
