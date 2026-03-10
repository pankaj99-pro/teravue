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
  /** Called when the polyline is clicked */
  onClick?: () => void;
}

/**
 * A polyline that animates its stroke from 0% to 100% length,
 * creating a progressive "draw" effect. Supports click events.
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
  onClick,
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
      interactive: !!onClick,
    }).addTo(map);

    // Add click handler
    if (onClick) {
      line.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onClick();
      });
      // Add hover cursor
      line.on("mouseover", () => {
        const el = (line as any)._path as SVGPathElement | undefined;
        if (el) el.style.cursor = "pointer";
      });
    }

    polylineRef.current = line;

    const el = (line as any)._path as SVGPathElement | undefined;
    const startTime = performance.now() + delay;

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
        line.setStyle({ opacity: opacity });
      } else {
        line.setStyle({ opacity: opacity * eased });
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
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
  }, [positions, color, weight, opacity, dashArray, isFlight, delay, duration, map, onClick]);

  return null;
}
