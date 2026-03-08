import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Bike, Train, Plane, Footprints, Zap, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import airportImg from "@/assets/airport.jpg";
import hotelImg from "@/assets/hotel.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import colosseumImg from "@/assets/colosseum.jpg";

interface MapStop {
  id: number;
  label: string;
  lat: number;
  lng: number;
  img: string;
}

interface MapPanelProps {
  activeStop: number;
  customStops?: MapStop[];
  dayTitle?: string;
}

const defaultStops: MapStop[] = [
  { id: 1, label: "Fiumicino Airport", lat: 41.8003, lng: 12.2389, img: airportImg },
  { id: 2, label: "Albergo Roma", lat: 41.8967, lng: 12.4822, img: hotelImg },
  { id: 3, label: "Trattoria da Enzo", lat: 41.8893, lng: 12.4692, img: restaurantImg },
  { id: 4, label: "Colosseum", lat: 41.8902, lng: 12.4922, img: colosseumImg },
  { id: 5, label: "Roman Forum", lat: 41.8925, lng: 12.4853, img: colosseumImg },
];

const transportModes = [
  { icon: Footprints, label: "Walk", time: "2h 10m" },
  { icon: Bike, label: "Bike", time: "55 min" },
  { icon: Car, label: "Car", time: "40 min" },
  { icon: Train, label: "Train", time: "35 min" },
  { icon: Plane, label: "Plane", time: "N/A" },
];

const routeDescriptions: Record<string, string> = {
  Walk: "A scenic walk through the city streets. Great for sightseeing along the way.",
  Bike: "Cycle through bike-friendly routes. Quick and eco-friendly option.",
  Car: "Moderate traffic — taxi is the fastest way to reach your destination now.",
  Train: "Metro or regional train. Fast and affordable for longer distances.",
  Plane: "Domestic or connecting flight if applicable for this route.",
};

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
    if (stop) {
      map.flyTo([stop.lat, stop.lng], 14, { duration: 1 });
    }
  }, [activeStop, stops, map]);
  return null;
}

export function MapPanel({ activeStop, customStops, dayTitle }: MapPanelProps) {
  const stops = customStops && customStops.length > 0 ? customStops : defaultStops;
  const routeCoords: [number, number][] = stops.map((s) => [s.lat, s.lng]);
  const center: [number, number] = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [41.89, 12.48];

  const [selectedMode, setSelectedMode] = useState("Car");
  const [showRouteCard, setShowRouteCard] = useState(true);

  const currentMode = transportModes.find((m) => m.label === selectedMode) || transportModes[2];
  const ModeIcon = currentMode.icon;

  const handleTransportSelect = (label: string) => {
    setSelectedMode(label);
    setShowRouteCard(true);
    toast.success(`${label} route selected`);
  };

  const handleBookTaxi = () => {
    toast.success("Taxi booking initiated! 🚕");
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
          pathOptions={{ color: "hsl(207,90%,54%)", weight: 3, opacity: 0.8, dashArray: "8 6" }}
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

      {/* Route info card with close button */}
      <AnimatePresence>
        {showRouteCard && (
          <motion.div
            className="absolute bottom-20 left-4 z-[1000] bg-white/90 backdrop-blur-md border border-border/30 shadow-lg rounded-xl p-4 w-64 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ModeIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{selectedMode} Route</span>
              </div>
              <button
                onClick={() => setShowRouteCard(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-lg font-bold text-foreground">{currentMode.time}</p>
            <div className="flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {routeDescriptions[selectedMode]}
              </p>
            </div>
            <button
              onClick={handleBookTaxi}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 transform duration-150"
            >
              {selectedMode === "Car" ? "Book a Taxi" : `Use ${selectedMode}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transport mode controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        {transportModes.map((mode) => (
          <button
            key={mode.label}
            onClick={() => handleTransportSelect(mode.label)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 ${
              selectedMode === mode.label
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-white/80 backdrop-blur-sm border border-border/30 text-muted-foreground hover:text-foreground hover:bg-white shadow-sm"
            }`}
            title={mode.label}
          >
            <mode.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
