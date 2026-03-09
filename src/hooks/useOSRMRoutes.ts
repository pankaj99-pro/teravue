import { useState, useEffect, useRef } from "react";
import type { MapStop } from "@/components/MapPanel";

interface OSRMRoute {
  fromId: number;
  toId: number;
  coordinates: [number, number][];
  isFlight: boolean;
}

/**
 * Fetches actual road-following polylines from OSRM for consecutive stops.
 * Flight segments get straight lines; all others follow roads.
 */
export function useOSRMRoutes(
  stops: MapStop[],
  activityTypes?: Record<number, string>
) {
  const [routes, setRoutes] = useState<OSRMRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, [number, number][]>>(new Map());

  useEffect(() => {
    if (stops.length < 2) {
      setRoutes([]);
      return;
    }

    let cancelled = false;

    const fetchRoutes = async () => {
      setLoading(true);
      const results: OSRMRoute[] = [];

      const promises = stops.slice(0, -1).map(async (from, i) => {
        const to = stops[i + 1];

        if (
          !isFinite(from.lat) || !isFinite(from.lng) ||
          !isFinite(to.lat) || !isFinite(to.lng)
        ) {
          return null;
        }

        // Check if this is a flight segment
        const fromType = activityTypes?.[from.id] ?? "";
        const toType = activityTypes?.[to.id] ?? "";
        const isFlight =
          fromType === "flight" || toType === "flight" ||
          from.label.toLowerCase().includes("airport") ||
          to.label.toLowerCase().includes("airport") ||
          from.label.toLowerCase().includes("flight") ||
          to.label.toLowerCase().includes("flight");

        if (isFlight) {
          return {
            fromId: from.id,
            toId: to.id,
            coordinates: [[from.lat, from.lng], [to.lat, to.lng]] as [number, number][],
            isFlight: true,
          };
        }

        // Check cache
        const cacheKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
        const cached = cacheRef.current.get(cacheKey);
        if (cached) {
          return {
            fromId: from.id,
            toId: to.id,
            coordinates: cached,
            isFlight: false,
          };
        }

        // Fetch from OSRM (free, no API key)
        // OSRM uses lng,lat order
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("OSRM error");

          const data = await res.json();
          const coords = data.routes?.[0]?.geometry?.coordinates;

          if (coords && coords.length > 0) {
            // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
            const latLngs: [number, number][] = coords.map(
              (c: [number, number]) => [c[1], c[0]]
            );
            cacheRef.current.set(cacheKey, latLngs);
            return {
              fromId: from.id,
              toId: to.id,
              coordinates: latLngs,
              isFlight: false,
            };
          }
        } catch {
          // Fallback to straight line on error
        }

        // Fallback: straight line
        return {
          fromId: from.id,
          toId: to.id,
          coordinates: [[from.lat, from.lng], [to.lat, to.lng]] as [number, number][],
          isFlight: false,
        };
      });

      const settled = await Promise.all(promises);
      if (!cancelled) {
        setRoutes(settled.filter(Boolean) as OSRMRoute[]);
        setLoading(false);
      }
    };

    fetchRoutes();

    return () => {
      cancelled = true;
    };
  }, [stops, activityTypes]);

  return { routes, loading };
}
