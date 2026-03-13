import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export type SegmentTransport = "train" | "flight" | "car" | "bike" | "walk";

interface AnimatedPolylineProps {
  positions: [number, number][];
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  isFlight?: boolean;
  transportType?: SegmentTransport;
  delay?: number;
  duration?: number;
  onClick?: () => void;
}

const TRANSPORT_EMOJIS: Record<SegmentTransport, string> = {
  train: "🚆",
  flight: "✈️",
  car: "🚕",
  bike: "🚲",
  walk: "🚶",
};

/**
 * Generate a quadratic Bézier curve for flight paths
 */
function generateFlightArc(start: [number, number], end: [number, number], numPoints = 50): [number, number][] {
  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const controlLat = midLat + (-dx * 0.3);
  const controlLng = midLng + (dy * 0.3);

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlLat + t * t * end[0];
    const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlLng + t * t * end[1];
    points.push([lat, lng]);
  }
  return points;
}

/**
 * A static polyline with transport icons along the path.
 * Train & Flight: no animation. Road: no animation.
 */
export function AnimatedPolyline({
  positions,
  color,
  weight,
  opacity,
  dashArray,
  isFlight = false,
  transportType,
  delay = 0,
  duration = 800,
  onClick,
}: AnimatedPolylineProps) {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!positions || positions.length < 2) return;

    // For flights, generate arc positions
    const renderPositions = isFlight
      ? generateFlightArc(positions[0], positions[positions.length - 1])
      : positions;

    const line = L.polyline(renderPositions, {
      color,
      weight,
      opacity,
      dashArray: isFlight ? undefined : dashArray,
      interactive: !!onClick,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    if (onClick) {
      line.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onClick();
      });
      line.on("mouseover", () => {
        const el = (line as any)._path as SVGPathElement | undefined;
        if (el) el.style.cursor = "pointer";
      });
    }

    polylineRef.current = line;

    // Add repeating transport icons along the path
    const effectiveType = transportType || (isFlight ? "flight" : "car");
    const emoji = TRANSPORT_EMOJIS[effectiveType] || "🚕";
    const addedMarkers: L.Marker[] = [];

    if (renderPositions.length > 2) {
      // Place icons every ~25% of the path
      const step = Math.max(1, Math.floor(renderPositions.length / 4));
      for (let i = step; i < renderPositions.length - 1; i += step) {
        const pos = renderPositions[i];
        const iconSize = isFlight ? 32 : 28;
        const icon = L.divIcon({
          className: "transport-icon-marker",
          html: `<div style="
            font-size:${isFlight ? 18 : 16}px;
            width:${iconSize}px;height:${iconSize}px;
            display:flex;align-items:center;justify-content:center;
            background:${color};
            border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            border:2px solid rgba(255,255,255,0.2);
            pointer-events:none;
          ">${emoji}</div>`,
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2],
        });
        const marker = L.marker(pos, { icon, interactive: false }).addTo(map);
        addedMarkers.push(marker);
      }
    }

    markersRef.current = addedMarkers;

    return () => {
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      for (const m of markersRef.current) map.removeLayer(m);
    };
  }, [positions, color, weight, opacity, dashArray, isFlight, transportType, map, onClick]);

  return null;
}
