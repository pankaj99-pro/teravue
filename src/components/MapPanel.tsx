import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, Bike, Train, Plane, Footprints, Zap } from "lucide-react";
import { toast } from "sonner";
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
  { icon: Car, label: "Car", active: true, time: "40 min" },
  { icon: Train, label: "Train", time: "35 min" },
  { icon: Plane, label: "Plane", time: "N/A" },
];

function createNumberedIcon(id: number, isActive: boolean) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;font-family:Inter,sans-serif;
      background:${isActive ? "hsl(207,90%,54%)" : "hsl(222,41%,10%)"};
      color:${isActive ? "hsl(222,47%,6%)" : "hsl(210,40%,96%)"};
      border:2px solid ${isActive ? "hsl(207,90%,64%)" : "hsl(222,20%,22%)"};
      box-shadow:${isActive ? "0 0 16px hsl(207,90%,54%,0.5)" : "0 2px 8px rgba(0,0,0,0.4)"};
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

  const handleTransportSelect = (label: string, time: string) => {
    toast.success(`${label} selected — estimated ${time}`);
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
        style={{ background: "hsl(222,47%,6%)" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: "hsl(207,90%,54%)", weight: 3, opacity: 0.7, dashArray: "8 6" }}
        />
        {stops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createNumberedIcon(stop.id, activeStop === stop.id)}>
            <Popup className="dark-popup">
              <div className="w-36 overflow-hidden rounded-lg" style={{ background: "hsl(222,41%,10%)" }}>
                <img src={stop.img} alt={stop.label} className="w-full h-20 object-cover" />
                <p className="text-xs p-2 text-center" style={{ color: "hsl(210,40%,96%)" }}>{stop.label}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyToActive activeStop={activeStop} stops={stops} />
      </MapContainer>

      {/* Day label */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel rounded-lg px-4 py-2 text-sm text-foreground">
        {dayTitle || "Day 1 - Arrival & Exploration"} <span className="text-muted-foreground ml-1">›</span>
      </div>

      {/* Route info card */}
      <div className="absolute bottom-20 left-4 z-[1000] glass-panel rounded-xl p-4 w-64 space-y-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Car Route</span>
        </div>
        <p className="text-lg font-bold text-foreground">40–50 minutes</p>
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Moderate traffic — taxi is the fastest way to reach your destination now.
          </p>
        </div>
        <button onClick={handleBookTaxi} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 transform duration-150">
          Book a Taxi
        </button>
      </div>

      {/* Transport mode controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        {transportModes.map((mode) => (
          <button
            key={mode.label}
            onClick={() => handleTransportSelect(mode.label, mode.time)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 ${
              mode.active ? "bg-primary text-primary-foreground" : "glass-panel text-muted-foreground hover:text-foreground hover:bg-accent"
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
