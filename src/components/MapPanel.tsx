import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Bike, Footprints, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useOSRMRoutes } from "@/hooks/useOSRMRoutes";
import { AnimatedPolyline, SegmentTransport } from "@/components/AnimatedPolyline";
import { SegmentDetailsPanel, TrainSegmentInfo, RoadSegmentInfo } from "@/components/SegmentDetailsPanel";

export interface MapStop {
  id: number;
  label: string;
  lat: number;
  lng: number;
  img: string;
  activityType?: string;
  trainNumber?: string;
  trainName?: string;
  departureTime?: string;
  arrivalTime?: string;
  platform?: string;
  intermediateStops?: string[];
}

export interface RouteSegment {
  from: string;
  to: string;
  modes: {
    transport_mode: string;
    distance_km: number;
    duration_minutes: number;
    polyline?: [number, number][];
  }[];
}

export type TransportMode = "car" | "bike" | "walk";

// Color scheme per spec
const TRANSPORT_COLORS: Record<string, string> = {
  train: "#2563EB",    // Railway Blue
  flight: "#0EA5E9",   // Sky Blue
  car: "#FACC15",      // Taxi Yellow
  bike: "#F97316",     // Orange
  walk: "#22C55E",     // Green
};

interface MapPanelProps {
  activeStop: number;
  customStops?: MapStop[];
  dayTitle?: string;
  routeSegments?: RouteSegment[];
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
}

const modeConfig: Record<TransportMode, { icon: typeof Car; label: string; color: string }> = {
  car: { icon: Car, label: "Car", color: TRANSPORT_COLORS.car },
  bike: { icon: Bike, label: "Bike", color: TRANSPORT_COLORS.bike },
  walk: { icon: Footprints, label: "Walk", color: TRANSPORT_COLORS.walk },
};

const ALL_MODES: TransportMode[] = ["walk", "bike", "car"];

function createNumberedIcon(id: number, isActive: boolean) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;font-family:'Space Grotesk',Inter,sans-serif;
      background:${isActive ? "#2563EB" : "hsl(225,25%,16%)"};
      color:${isActive ? "#fff" : "hsl(210,40%,90%)"};
      border:2.5px solid ${isActive ? "#60a5fa" : "hsl(225,15%,30%)"};
      box-shadow:${isActive ? "0 0 20px rgba(37,99,235,0.5)" : "0 2px 8px rgba(0,0,0,0.3)"};
      transform:${isActive ? "scale(1.25)" : "scale(1)"};
      transition:all 0.3s;
    ">${id}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function FlyToActive({ activeStop, stops }: { activeStop: number; stops: MapStop[] }) {
  const map = useMap();
  useEffect(() => {
    const stop = stops.find((s) => s.id === activeStop);
    if (stop && isFinite(stop.lat) && isFinite(stop.lng)) {
      map.flyTo([stop.lat, stop.lng], 14, { duration: 1 });
    }
  }, [activeStop, stops, map]);
  return null;
}

interface SelectedSegment {
  index: number;
  type: "train" | "flight" | "road";
  trainInfo?: TrainSegmentInfo;
  roadInfo?: RoadSegmentInfo;
}

export function MapPanel({ activeStop, customStops, dayTitle, routeSegments, selectedMode, onModeChange }: MapPanelProps) {
  const stops = customStops ?? [];
  const segments = routeSegments ?? [];
  const center: [number, number] = stops.length > 0 && isFinite(stops[0].lat) && isFinite(stops[0].lng)
    ? [stops[0].lat, stops[0].lng]
    : [20, 0];

  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const prevDayRef = useRef(dayTitle);

  useEffect(() => {
    if (dayTitle !== prevDayRef.current) {
      prevDayRef.current = dayTitle;
      setAnimKey((k) => k + 1);
      setSelectedSegment(null);
    }
  }, [dayTitle]);

  const config = modeConfig[selectedMode];

  const activityTypes = useMemo(() => {
    const map: Record<number, string> = {};
    for (const s of stops) {
      if (s.activityType) map[s.id] = s.activityType;
    }
    return map;
  }, [stops]);

  const { routes: osrmRoutes, loading: routesLoading } = useOSRMRoutes(stops, activityTypes);

  // Detect segment transport types
  const segmentTypes = useMemo(() => {
    return stops.slice(0, -1).map((from, i) => {
      const to = stops[i + 1];
      const isTrain =
        from.activityType === "train" || to.activityType === "train" ||
        !!from.trainNumber || !!to.trainNumber;
      const isFlight =
        from.activityType === "flight" || to.activityType === "flight" ||
        from.label.toLowerCase().includes("airport") ||
        to.label.toLowerCase().includes("airport") ||
        from.label.toLowerCase().includes("flight") ||
        to.label.toLowerCase().includes("flight");
      const transport: SegmentTransport = isTrain ? "train" : isFlight ? "flight" : selectedMode;
      return { from, to, isTrain, isFlight, transport };
    });
  }, [stops, selectedMode]);

  const handleSegmentClick = useCallback((segIndex: number) => {
    const segType = segmentTypes[segIndex];
    if (!segType) return;

    if (segType.isTrain) {
      const trainStop = segType.from.trainNumber ? segType.from : segType.to;
      const trainInfo: TrainSegmentInfo = {
        trainNumber: trainStop.trainNumber,
        trainName: trainStop.trainName,
        departureStation: segType.from.label,
        arrivalStation: segType.to.label,
        departureTime: trainStop.departureTime,
        arrivalTime: trainStop.arrivalTime,
        platform: trainStop.platform,
        intermediateStops: trainStop.intermediateStops,
      };
      setSelectedSegment({ index: segIndex, type: "train", trainInfo });
    } else if (segType.isFlight) {
      // Flight segments show basic info, no mode switching
      const trainInfo: TrainSegmentInfo = {
        trainNumber: "Flight",
        trainName: `${segType.from.label} → ${segType.to.label}`,
        departureStation: segType.from.label,
        arrivalStation: segType.to.label,
      };
      setSelectedSegment({ index: segIndex, type: "flight", trainInfo });
    } else {
      const seg = segments[segIndex];
      const roadInfo: RoadSegmentInfo = seg
        ? { from: seg.from, to: seg.to, modes: seg.modes }
        : { from: segType.from.label, to: segType.to.label, modes: [] };
      setSelectedSegment({ index: segIndex, type: "road", roadInfo });
    }
  }, [segmentTypes, segments]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <MapContainer
        center={center}
        zoom={stops.length > 0 ? 12 : 2}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "hsl(225, 20%, 12%)" }}
      >
        {/* Medium-dark map theme - Stadia Alidade Smooth Dark */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia</a>'
        />

        {/* Render polylines with transport-specific styling */}
        {osrmRoutes.map((route, i) => {
          const segInfo = segmentTypes[i];
          const transport = segInfo?.transport ?? selectedMode;
          const segColor = TRANSPORT_COLORS[transport] || config.color;
          const segWeight = segInfo?.isTrain ? 5 : segInfo?.isFlight ? 4 : 4;

          return (
            <AnimatedPolyline
              key={`route-${route.fromId}-${route.toId}-${animKey}-${transport}`}
              positions={route.coordinates}
              color={segColor}
              weight={segWeight}
              opacity={0.9}
              dashArray={
                segInfo?.isTrain ? "14 8" : undefined
              }
              isFlight={route.isFlight || segInfo?.isFlight}
              transportType={transport}
              delay={i * 400}
              duration={700}
              onClick={() => handleSegmentClick(i)}
            />
          );
        })}

        {/* Fallback straight lines */}
        {osrmRoutes.length === 0 && stops.length > 1 && !routesLoading && (
          <Polyline
            positions={stops
              .filter((s) => isFinite(s.lat) && isFinite(s.lng))
              .map((s) => [s.lat, s.lng] as [number, number])}
            pathOptions={{
              color: config.color,
              weight: 3,
              opacity: 0.4,
              dashArray: "4 8",
            }}
          />
        )}

        {stops.map((stop, index) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createNumberedIcon(index + 1, activeStop === stop.id)}>
            <Popup>
              <div className="w-40 overflow-hidden rounded-lg">
                <img src={stop.img} alt={stop.label} className="w-full h-20 object-cover" />
                <p className="text-xs p-2.5 text-center text-foreground font-medium font-display">{stop.label}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <FlyToActive activeStop={activeStop} stops={stops} />
      </MapContainer>

      {/* Day title */}
      <div className="absolute top-4 right-4 z-[1000] bg-card/90 backdrop-blur-md border border-glass-border shadow-lg rounded-xl px-4 py-2.5 text-sm text-foreground font-semibold font-display">
        {dayTitle || "No day selected"}
      </div>

      {/* Route loading indicator */}
      <AnimatePresence>
        {routesLoading && stops.length > 1 && (
          <motion.div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border rounded-xl px-4 py-2.5 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Loading routes…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segment details panel */}
      <AnimatePresence>
        {selectedSegment && (
          <SegmentDetailsPanel
            type={selectedSegment.type === "flight" ? "train" : selectedSegment.type}
            trainInfo={selectedSegment.trainInfo}
            roadInfo={selectedSegment.roadInfo}
            selectedMode={selectedMode}
            onModeChange={onModeChange}
            onClose={() => setSelectedSegment(null)}
            isFixed={selectedSegment.type === "train" || selectedSegment.type === "flight"}
          />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {segments.length === 0 && stops.length > 0 && !selectedSegment && !routesLoading && (
        <div className="absolute bottom-20 left-4 z-[1000] rounded-xl border border-border bg-card/95 px-4 py-3 text-xs text-muted-foreground shadow-lg">
          Click a path on the map to view travel details.
        </div>
      )}

      {stops.length === 0 && (
        <div className="absolute inset-0 z-[900] flex items-center justify-center pointer-events-none">
          <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-lg">
            No map data available. Load a trip to see stops and routes.
          </div>
        </div>
      )}

      {/* Transport mode buttons - only road modes (no train) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        {ALL_MODES.map((mode) => {
          const mc = modeConfig[mode];
          const Icon = mc.icon;
          const isSelected = mode === selectedMode;

          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isSelected
                  ? "text-black shadow-lg"
                  : "bg-card/80 backdrop-blur-sm border border-glass-border text-muted-foreground hover:text-foreground hover:bg-accent shadow-md"
              }`}
              style={isSelected ? { background: mc.color } : undefined}
              title={mc.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-card/90 backdrop-blur-md border border-glass-border rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: TRANSPORT_COLORS.train }} />
          <span>Train</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: TRANSPORT_COLORS.flight }} />
          <span>Flight</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: TRANSPORT_COLORS.car }} />
          <span>Car</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: TRANSPORT_COLORS.bike }} />
          <span>Bike</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: TRANSPORT_COLORS.walk }} />
          <span>Walk</span>
        </div>
      </div>
    </div>
  );
}
