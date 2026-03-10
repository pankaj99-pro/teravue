import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Bike, Train, Footprints, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useOSRMRoutes } from "@/hooks/useOSRMRoutes";
import { AnimatedPolyline } from "@/components/AnimatedPolyline";
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

export type TransportMode = "car" | "bike" | "walk" | "train";

interface MapPanelProps {
  activeStop: number;
  customStops?: MapStop[];
  dayTitle?: string;
  routeSegments?: RouteSegment[];
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
}

const modeConfig: Record<TransportMode, { icon: typeof Car; label: string; color: string; description: string }> = {
  car: { icon: Car, label: "Car", color: "hsl(210,100%,60%)", description: "Fastest by road." },
  bike: { icon: Bike, label: "Bike", color: "hsl(142,70%,50%)", description: "Eco-friendly cycling." },
  walk: { icon: Footprints, label: "Walk", color: "hsl(32,95%,60%)", description: "Scenic walk for short distances." },
  train: { icon: Train, label: "Train", color: "hsl(330,80%,60%)", description: "Rail travel between cities." },
};

const ALL_MODES: TransportMode[] = ["walk", "bike", "car", "train"];
const TRAIN_COLOR = "hsl(330,80%,60%)"; // Pink

function createNumberedIcon(id: number, isActive: boolean) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;font-family:'Space Grotesk',Inter,sans-serif;
      background:${isActive ? "hsl(210,100%,60%)" : "hsl(225,25%,16%)"};
      color:${isActive ? "hsl(225,30%,4%)" : "hsl(210,40%,90%)"};
      border:2.5px solid ${isActive ? "hsl(210,100%,72%)" : "hsl(225,15%,30%)"};
      box-shadow:${isActive ? "0 0 18px hsl(210,100%,60%,0.5)" : "0 2px 8px rgba(0,0,0,0.3)"};
      transform:${isActive ? "scale(1.25)" : "scale(1)"};
      transition:all 0.3s;
    ">${id}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface SelectedSegment {
  index: number;
  type: "train" | "road";
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

  const { routes: osrmRoutes } = useOSRMRoutes(stops, activityTypes);

  // Detect which segments are train segments
  const segmentTypes = useMemo(() => {
    return stops.slice(0, -1).map((from, i) => {
      const to = stops[i + 1];
      const isTrain =
        from.activityType === "train" || to.activityType === "train" ||
        !!from.trainNumber || !!to.trainNumber;
      return { from, to, isTrain };
    });
  }, [stops]);

  const handleSegmentClick = useCallback((segIndex: number) => {
    const segType = segmentTypes[segIndex];
    if (!segType) return;

    if (segType.isTrain) {
      // Find the train stop (the one with train metadata)
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
    } else {
      const seg = segments[segIndex];
      const roadInfo: RoadSegmentInfo = seg
        ? { from: seg.from, to: seg.to, modes: seg.modes }
        : { from: segType.from.label, to: segType.to.label, modes: [] };
      setSelectedSegment({ index: segIndex, type: "road", roadInfo });
    }
  }, [segmentTypes, segments]);

  const handleModeChange = (mode: TransportMode) => {
    onModeChange(mode);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <MapContainer
        center={center}
        zoom={stops.length > 0 ? 12 : 2}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "hsl(225, 25%, 7%)" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Render road-following polylines with train detection */}
        {osrmRoutes.map((route, i) => {
          const isTrain = segmentTypes[i]?.isTrain ?? false;
          const segColor = isTrain ? TRAIN_COLOR : route.isFlight ? "hsl(0, 0%, 60%)" : config.color;
          const segWeight = isTrain ? 5 : route.isFlight ? 2 : 4;

          return (
            <AnimatedPolyline
              key={`route-${route.fromId}-${route.toId}-${animKey}`}
              positions={route.coordinates}
              color={segColor}
              weight={segWeight}
              opacity={0.85}
              dashArray={
                isTrain
                  ? "12 8"
                  : route.isFlight
                  ? "8 12"
                  : selectedMode === "walk"
                  ? "6 8"
                  : selectedMode === "bike"
                  ? "12 6"
                  : undefined
              }
              isFlight={route.isFlight}
              delay={i * 400}
              duration={700}
              onClick={() => handleSegmentClick(i)}
            />
          );
        })}

        {/* Fallback straight lines */}
        {osrmRoutes.length === 0 && stops.length > 1 && (
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

      {/* Segment details panel - shown on path click */}
      <AnimatePresence>
        {selectedSegment && (
          <SegmentDetailsPanel
            type={selectedSegment.type}
            trainInfo={selectedSegment.trainInfo}
            roadInfo={selectedSegment.roadInfo}
            selectedMode={selectedMode}
            onModeChange={handleModeChange}
            onClose={() => setSelectedSegment(null)}
          />
        )}
      </AnimatePresence>

      {/* Empty state messages */}
      {segments.length === 0 && stops.length > 0 && !selectedSegment && (
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

      {/* Transport mode buttons on right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        {ALL_MODES.map((mode) => {
          const mc = modeConfig[mode];
          const Icon = mc.icon;
          const isSelected = mode === selectedMode;

          return (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isSelected
                  ? "text-white shadow-lg"
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
      <div className="absolute bottom-4 right-4 z-[1000] bg-card/90 backdrop-blur-md border border-glass-border rounded-lg px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: TRAIN_COLOR }} />
          <span>Train</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: config.color }} />
          <span>Road</span>
        </div>
      </div>
    </div>
  );
}
