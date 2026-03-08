import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Bike, Train, Footprints, Zap, X, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import airportImg from "@/assets/airport.jpg";
import hotelImg from "@/assets/hotel.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import colosseumImg from "@/assets/colosseum.jpg";

export interface MapStop {
  id: number;
  label: string;
  lat: number;
  lng: number;
  img: string;
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

const defaultStops: MapStop[] = [
  { id: 1, label: "Fiumicino Airport", lat: 41.8003, lng: 12.2389, img: airportImg },
  { id: 2, label: "Albergo Roma", lat: 41.8967, lng: 12.4822, img: hotelImg },
  { id: 3, label: "Trattoria da Enzo", lat: 41.8893, lng: 12.4692, img: restaurantImg },
  { id: 4, label: "Colosseum", lat: 41.8902, lng: 12.4922, img: colosseumImg },
  { id: 5, label: "Roman Forum", lat: 41.8925, lng: 12.4853, img: colosseumImg },
];

const modeConfig: Record<TransportMode, { icon: typeof Car; label: string; color: string; description: string }> = {
  car: { icon: Car, label: "Car", color: "hsl(207,90%,54%)", description: "Fastest by road. Includes taxi and rideshare options." },
  bike: { icon: Bike, label: "Bike", color: "hsl(142,70%,45%)", description: "Eco-friendly cycling through bike lanes and streets." },
  walk: { icon: Footprints, label: "Walk", color: "hsl(32,95%,55%)", description: "Scenic walk — great for short distances and sightseeing." },
  train: { icon: Train, label: "Train", color: "hsl(270,60%,55%)", description: "Metro or regional rail. Fast for longer distances." },
};

const ALL_MODES: TransportMode[] = ["walk", "bike", "car", "train"];

// Default demo route segments
const defaultSegments: RouteSegment[] = [
  {
    from: "Fiumicino Airport", to: "Albergo Roma",
    modes: [
      { transport_mode: "car", distance_km: 32, duration_minutes: 40 },
      { transport_mode: "train", distance_km: 35, duration_minutes: 35 },
      { transport_mode: "bike", distance_km: 30, duration_minutes: 95 },
      { transport_mode: "walk", distance_km: 29, duration_minutes: 360 },
    ],
  },
  {
    from: "Albergo Roma", to: "Trattoria da Enzo",
    modes: [
      { transport_mode: "car", distance_km: 2.5, duration_minutes: 8 },
      { transport_mode: "bike", distance_km: 2.8, duration_minutes: 10 },
      { transport_mode: "walk", distance_km: 2.3, duration_minutes: 28 },
      { transport_mode: "train", distance_km: 3.1, duration_minutes: 12 },
    ],
  },
  {
    from: "Trattoria da Enzo", to: "Colosseum",
    modes: [
      { transport_mode: "car", distance_km: 3.2, duration_minutes: 10 },
      { transport_mode: "bike", distance_km: 3.5, duration_minutes: 12 },
      { transport_mode: "walk", distance_km: 2.9, duration_minutes: 35 },
      { transport_mode: "train", distance_km: 4, duration_minutes: 15 },
    ],
  },
  {
    from: "Colosseum", to: "Roman Forum",
    modes: [
      { transport_mode: "car", distance_km: 0.5, duration_minutes: 3 },
      { transport_mode: "bike", distance_km: 0.5, duration_minutes: 2 },
      { transport_mode: "walk", distance_km: 0.4, duration_minutes: 5 },
      { transport_mode: "train", distance_km: 0.8, duration_minutes: 5 },
    ],
  },
];

function createNumberedIcon(id: number, isActive: boolean) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;font-family:Inter,sans-serif;
      background:${isActive ? "hsl(207,90%,54%)" : "hsl(220,15%,96%)"};
      color:${isActive ? "#fff" : "hsl(220,15%,25%)"};
      border:2px solid ${isActive ? "hsl(207,90%,64%)" : "hsl(220,15%,85%)"};
      box-shadow:${isActive ? "0 0 16px hsl(207,90%,54%,0.5)" : "0 2px 6px rgba(0,0,0,0.15)"};
      transform:${isActive ? "scale(1.25)" : "scale(1)"};
      transition:all 0.3s;
    ">${id}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FlyToActive({ activeStop, stops }: { activeStop: number; stops: MapStop[] }) {
  const map = useMap();
  useEffect(() => {
    const stop = stops.find((s) => s.id === activeStop);
    if (stop) map.flyTo([stop.lat, stop.lng], 14, { duration: 1 });
  }, [activeStop, stops, map]);
  return null;
}

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function MapPanel({ activeStop, customStops, dayTitle, routeSegments, selectedMode, onModeChange }: MapPanelProps) {
  const stops = customStops && customStops.length > 0 ? customStops : defaultStops;
  const segments = routeSegments && routeSegments.length > 0 ? routeSegments : defaultSegments;
  const center: [number, number] = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [41.89, 12.48];

  const [showRouteCard, setShowRouteCard] = useState(true);

  const config = modeConfig[selectedMode];
  const ModeIcon = config.icon;

  // Calculate total distance and duration for selected mode
  const totals = useMemo(() => {
    let dist = 0, dur = 0;
    for (const seg of segments) {
      const m = seg.modes.find((md) => md.transport_mode === selectedMode);
      if (m) { dist += m.distance_km; dur += m.duration_minutes; }
    }
    return { distance: dist.toFixed(1), duration: formatDuration(dur) };
  }, [segments, selectedMode]);

  // Build polyline from stops (fallback when no custom polylines)
  const routeCoords: [number, number][] = stops.map((s) => [s.lat, s.lng]);

  const handleModeChange = (mode: TransportMode) => {
    onModeChange(mode);
    setShowRouteCard(true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "hsl(210, 20%, 98%)" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: config.color, weight: 4, opacity: 0.85, dashArray: selectedMode === "walk" ? "6 8" : selectedMode === "bike" ? "12 6" : undefined }}
        />
        {stops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createNumberedIcon(stop.id, activeStop === stop.id)}>
            <Popup>
              <div className="w-36 overflow-hidden rounded-lg bg-white">
                <img src={stop.img} alt={stop.label} className="w-full h-20 object-cover" />
                <p className="text-xs p-2 text-center text-gray-800 font-medium">{stop.label}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyToActive activeStop={activeStop} stops={stops} />
      </MapContainer>

      {/* Day label */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md border border-border/30 shadow-sm rounded-lg px-4 py-2 text-sm text-foreground font-medium">
        {dayTitle || "Day 1 - Arrival & Exploration"} <span className="text-muted-foreground ml-1">›</span>
      </div>

      {/* Route info card */}
      <AnimatePresence>
        {showRouteCard && (
          <motion.div
            className="absolute bottom-20 left-4 z-[1000] bg-white/90 backdrop-blur-md border border-border/30 shadow-lg rounded-xl p-4 w-72 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${config.color}20` }}>
                  <ModeIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
                </div>
                <span className="text-xs font-medium text-foreground">{config.label} Route</span>
              </div>
              <button
                onClick={() => setShowRouteCard(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <p className="text-xl font-bold text-foreground">{totals.duration}</p>
              <p className="text-xs text-muted-foreground">{totals.distance} km total</p>
            </div>

            <div className="flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
            </div>

            {/* Segment breakdown */}
            <div className="space-y-1.5 pt-1 border-t border-border/30">
              {segments.map((seg, i) => {
                const modeData = seg.modes.find((m) => m.transport_mode === selectedMode);
                if (!modeData) return null;
                return (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground truncate flex-1 mr-2">{seg.from} → {seg.to}</span>
                    <span className="text-foreground font-medium whitespace-nowrap">{formatDuration(modeData.duration_minutes)}</span>
                  </div>
                );
              })}
            </div>

            {/* Mode comparison */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/30">
              {ALL_MODES.map((mode) => {
                const mc = modeConfig[mode];
                const Icon = mc.icon;
                let totalDur = 0;
                for (const seg of segments) {
                  const m = seg.modes.find((md) => md.transport_mode === mode);
                  if (m) totalDur += m.duration_minutes;
                }
                const isSelected = mode === selectedMode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-muted/30"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? mc.color : undefined }} />
                    <span className={`text-[9px] font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {formatDuration(totalDur)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transport mode controls (right sidebar) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        {ALL_MODES.map((mode) => {
          const mc = modeConfig[mode];
          const Icon = mc.icon;
          const isSelected = mode === selectedMode;
          return (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isSelected
                  ? "text-white shadow-md"
                  : "bg-white/80 backdrop-blur-sm border border-border/30 text-muted-foreground hover:text-foreground hover:bg-white shadow-sm"
              }`}
              style={isSelected ? { background: mc.color } : undefined}
              title={mc.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
