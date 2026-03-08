import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Bike, Train, Footprints, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const modeConfig: Record<TransportMode, { icon: typeof Car; label: string; color: string; description: string }> = {
  car: { icon: Car, label: "Car", color: "hsl(210,100%,60%)", description: "Fastest by road. Includes taxi and rideshare options." },
  bike: { icon: Bike, label: "Bike", color: "hsl(142,70%,50%)", description: "Eco-friendly cycling through bike lanes and streets." },
  walk: { icon: Footprints, label: "Walk", color: "hsl(32,95%,60%)", description: "Scenic walk — great for short distances and sightseeing." },
  train: { icon: Train, label: "Train", color: "hsl(270,65%,60%)", description: "Metro or regional rail. Fast for longer distances." },
};

const ALL_MODES: TransportMode[] = ["walk", "bike", "car", "train"];

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
  const stops = customStops ?? [];
  const segments = routeSegments ?? [];
  const center: [number, number] = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [20, 0];

  const [showRouteCard, setShowRouteCard] = useState(true);

  const config = modeConfig[selectedMode];
  const ModeIcon = config.icon;

  const totals = useMemo(() => {
    let dist = 0;
    let dur = 0;

    for (const seg of segments) {
      const m = seg.modes.find((md) => md.transport_mode === selectedMode);
      if (m) {
        dist += m.distance_km;
        dur += m.duration_minutes;
      }
    }

    return { distance: dist.toFixed(1), duration: formatDuration(dur) };
  }, [segments, selectedMode]);

  const routeCoords: [number, number][] = stops.map((s) => [s.lat, s.lng]);

  const handleModeChange = (mode: TransportMode) => {
    onModeChange(mode);
    setShowRouteCard(true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <MapContainer
        center={center}
        zoom={stops.length > 0 ? 12 : 2}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "hsl(210, 20%, 98%)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: config.color,
              weight: 4,
              opacity: 0.85,
              dashArray: selectedMode === "walk" ? "6 8" : selectedMode === "bike" ? "12 6" : undefined,
            }}
          />
        )}

        {stops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createNumberedIcon(stop.id, activeStop === stop.id)}>
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

      <div className="absolute top-4 right-4 z-[1000] bg-card/90 backdrop-blur-md border border-glass-border shadow-lg rounded-xl px-4 py-2.5 text-sm text-foreground font-semibold font-display">
        {dayTitle || "No day selected"}
      </div>

      <AnimatePresence>
        {showRouteCard && segments.length > 0 && (
          <motion.div
            className="absolute bottom-20 left-4 z-[1000] bg-[hsl(225,25%,11%)] border border-glass-border shadow-2xl rounded-xl p-4 w-72 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config.color}20` }}>
                  <ModeIcon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <span className="text-sm font-semibold text-foreground font-display">{config.label} Route</span>
              </div>
              <button
                onClick={() => setShowRouteCard(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold text-foreground font-display">{totals.duration}</p>
              <p className="text-sm text-muted-foreground font-medium">{totals.distance} km total</p>
            </div>

            <div className="flex items-start gap-2.5 bg-muted/30 rounded-lg px-3 py-2.5">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-relaxed">{config.description}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Segments</p>
              {segments.map((seg, i) => {
                const modeData = seg.modes.find((m) => m.transport_mode === selectedMode);
                if (!modeData) return null;

                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground/70 truncate flex-1 mr-3">{seg.from} → {seg.to}</span>
                    <span className="text-foreground font-semibold whitespace-nowrap">{formatDuration(modeData.duration_minutes)}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-border/40">
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
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                      isSelected ? "bg-primary/15 border border-primary/30" : "hover:bg-muted/40 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" style={{ color: isSelected ? mc.color : "hsl(215,20%,55%)" }} />
                    <span className={`text-[10px] font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {formatDuration(totalDur)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {segments.length === 0 && stops.length > 0 && (
        <div className="absolute bottom-20 left-4 z-[1000] rounded-xl border border-border bg-card/95 px-4 py-3 text-xs text-muted-foreground shadow-lg">
          Route details are unavailable for this day.
        </div>
      )}

      {stops.length === 0 && (
        <div className="absolute inset-0 z-[900] flex items-center justify-center pointer-events-none">
          <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-lg">
            No map data available. Load a trip to see stops and routes.
          </div>
        </div>
      )}

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
    </div>
  );
}

