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
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Control point perpendicular to midpoint, height proportional to distance
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
 * A polyline that animates its stroke from 0% to 100% length,
 * with transport icons along the path and flight arc support.
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
  const animMarkerRef = useRef<L.Marker | null>(null);
  const rafRef = useRef<number>(0);
  const flightRafRef = useRef<number>(0);

  useEffect(() => {
    if (!positions || positions.length < 2) return;

    // For flights, generate arc positions
    const renderPositions = isFlight
      ? generateFlightArc(positions[0], positions[positions.length - 1])
      : positions;

    const line = L.polyline(renderPositions, {
      color,
      weight,
      opacity: 0,
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

    // Add repeating transport icons along the path (not for flights - those get animated icon)
    const effectiveType = transportType || (isFlight ? "flight" : "car");
    const emoji = TRANSPORT_EMOJIS[effectiveType] || "🚕";
    const addedMarkers: L.Marker[] = [];

    if (!isFlight && renderPositions.length > 2) {
      // Place icons every ~25% of the path
      const step = Math.max(1, Math.floor(renderPositions.length / 4));
      for (let i = step; i < renderPositions.length - 1; i += step) {
        const pos = renderPositions[i];
        const icon = L.divIcon({
          className: "transport-icon-marker",
          html: `<div style="
            font-size:16px;
            width:28px;height:28px;
            display:flex;align-items:center;justify-content:center;
            background:${color};
            border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            border:2px solid rgba(255,255,255,0.2);
            pointer-events:none;
          ">${emoji}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker(pos, { icon, interactive: false }).addTo(map);
        addedMarkers.push(marker);
      }
    }

    // For flights, add animated moving icon
    if (isFlight) {
      const flightIcon = L.divIcon({
        className: "flight-animated-marker",
        html: `<div style="
          font-size:20px;
          width:32px;height:32px;
          display:flex;align-items:center;justify-content:center;
          background:${color};
          border-radius:50%;
          box-shadow:0 0 16px ${color}, 0 2px 8px rgba(0,0,0,0.4);
          border:2px solid rgba(255,255,255,0.3);
          pointer-events:none;
          transition:transform 0.1s;
        ">✈️</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const animMarker = L.marker(renderPositions[0], { icon: flightIcon, interactive: false }).addTo(map);
      animMarkerRef.current = animMarker;

      // Animate flight icon along the arc continuously
      let flightProgress = 0;
      const animateFlight = () => {
        flightProgress += 0.003;
        if (flightProgress > 1) flightProgress = 0;
        const idx = Math.floor(flightProgress * (renderPositions.length - 1));
        const pos = renderPositions[Math.min(idx, renderPositions.length - 1)];
        animMarker.setLatLng(pos);
        flightRafRef.current = requestAnimationFrame(animateFlight);
      };
      // Start flight animation after draw animation
      setTimeout(() => {
        flightRafRef.current = requestAnimationFrame(animateFlight);
      }, delay + duration);
    }

    markersRef.current = addedMarkers;

    // Draw animation
    const el = (line as any)._path as SVGPathElement | undefined;
    const startTime = performance.now() + delay;

    // Hide markers initially
    for (const m of addedMarkers) {
      const mEl = (m as any)._icon as HTMLElement | undefined;
      if (mEl) mEl.style.opacity = "0";
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (el) {
        const totalLength = el.getTotalLength();
        const visible = totalLength * eased;
        const hidden = totalLength - visible;
        el.style.strokeDasharray = `${visible} ${hidden}`;
        el.style.strokeDashoffset = "0";
        line.setStyle({ opacity });
      } else {
        line.setStyle({ opacity: opacity * eased });
      }

      // Fade in markers proportionally
      for (let mi = 0; mi < addedMarkers.length; mi++) {
        const markerProgress = (mi + 1) / (addedMarkers.length + 1);
        const mEl = (addedMarkers[mi] as any)._icon as HTMLElement | undefined;
        if (mEl) {
          mEl.style.opacity = eased >= markerProgress ? "1" : "0";
          mEl.style.transition = "opacity 0.3s";
        }
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // After animation completes, set final dash pattern
        if (el && dashArray && !isFlight) {
          el.style.strokeDasharray = dashArray;
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(flightRafRef.current);
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      for (const m of markersRef.current) map.removeLayer(m);
      if (animMarkerRef.current) map.removeLayer(animMarkerRef.current);
    };
  }, [positions, color, weight, opacity, dashArray, isFlight, transportType, delay, duration, map, onClick]);

  return null;
}
