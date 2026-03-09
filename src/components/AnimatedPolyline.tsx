import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface AnimatedPolylineProps {
  positions: [number, number][];
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  isFlight?: boolean;
  /** Delay in ms before this segment starts animating */
  delay?: number;
  /** Duration in ms for the draw animation */
  duration?: number;
}

/**
 * A polyline that animates its stroke from 0% to 100% length,
 * creating a progressive "draw" effect.
 */
export function AnimatedPolyline({
  positions,
  color,
  weight,
  opacity,
  dashArray,
  isFlight = false,
  delay = 0,
  duration = 800,
}: AnimatedPolylineProps) {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!positions || positions.length < 2) return;

    const line = L.polyline(positions, {
      color,
      weight,
      opacity: 0,
      dashArray: isFlight ? dashArray : undefined,
    }).addTo(map);

    polylineRef.current = line;

    // Calculate total pixel length for dash animation
    const el = (line as any)._path as SVGPathElement | undefined;

    const startTime = performance.now() + delay;

    const animate = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed < 0) {
        // Still in delay period
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      if (el) {
        const totalLength = el.getTotalLength();
        // Use SVG dasharray trick: visible portion grows, hidden shrinks
        const visible = totalLength * eased;
        const hidden = totalLength - visible;
        el.style.strokeDasharray = `${visible} ${hidden}`;
        el.style.strokeDashoffset = "0";
        line.setStyle({ opacity: opacity });
      } else {
        // Fallback: just fade in
        line.setStyle({ opacity: opacity * eased });
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Animation done — apply final dash pattern if any
        if (el && dashArray && !isFlight) {
          el.style.strokeDasharray = dashArray;
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }
    };
  }, [positions, color, weight, opacity, dashArray, isFlight, delay, duration, map]);

  return null;
}
