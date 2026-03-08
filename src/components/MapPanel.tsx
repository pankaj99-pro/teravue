import { Car, Bike, Train, Plane, Footprints, Minus, Plus, Navigation, Layers, Zap } from "lucide-react";
import romeMap from "@/assets/rome-map.jpg";
import airportImg from "@/assets/airport.jpg";
import hotelImg from "@/assets/hotel.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import colosseumImg from "@/assets/colosseum.jpg";

interface MapPanelProps {
  activeStop: number;
}

const stops = [
  { id: 1, label: "Fiumicino Airport", x: "18%", y: "82%", img: airportImg },
  { id: 2, label: "Albergo Roma", x: "72%", y: "42%", img: hotelImg },
  { id: 3, label: "Trattoria da Enzo", x: "55%", y: "55%", img: restaurantImg },
  { id: 4, label: "Colosseum", x: "52%", y: "30%", img: colosseumImg },
  { id: 5, label: "Roman Forum", x: "62%", y: "22%", img: romeMap },
];

const transportModes = [
  { icon: Footprints, label: "Walk" },
  { icon: Bike, label: "Bike" },
  { icon: Car, label: "Car", active: true },
  { icon: Train, label: "Train" },
  { icon: Plane, label: "Plane" },
];

export function MapPanel({ activeStop }: MapPanelProps) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Map background */}
      <img src={romeMap} alt="Rome Map" className="w-full h-full object-cover opacity-90" />

      {/* Day label */}
      <div className="absolute top-4 right-4 glass-panel rounded-lg px-4 py-2 text-sm text-foreground">
        Day 1 - Arrival & Exploration <span className="text-muted-foreground ml-1">›</span>
      </div>

      {/* Route line SVG overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M18,82 C25,70 40,60 55,55 S65,45 72,42 S58,35 52,30 S60,25 62,22"
          fill="none"
          stroke="hsl(207 90% 54%)"
          strokeWidth="0.4"
          strokeDasharray="1 0.5"
          opacity="0.7"
        />
      </svg>

      {/* Map stops */}
      {stops.map((stop) => (
        <div
          key={stop.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: stop.x, top: stop.y }}
        >
          {/* Marker */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-pointer ${
              activeStop === stop.id
                ? "bg-primary text-primary-foreground scale-125 glow-primary"
                : "bg-card/90 text-foreground border border-border hover:scale-110"
            }`}
          >
            {stop.id}
          </div>

          {/* Preview on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="glass-panel rounded-lg overflow-hidden w-28">
              <img src={stop.img} alt={stop.label} className="w-full h-16 object-cover" />
              <p className="text-[10px] text-foreground p-1.5 text-center truncate">{stop.label}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Route info card */}
      <div className="absolute bottom-20 right-4 glass-panel rounded-xl p-4 w-64 space-y-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Car Route</span>
        </div>
        <p className="text-lg font-bold text-foreground">40–50 minutes</p>
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Moderate traffic — taxi is the fastest way to reach your hotel now.
          </p>
        </div>
        <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Book a Taxi
        </button>
      </div>

      {/* Transport mode controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {transportModes.map((mode) => (
          <button
            key={mode.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
              mode.active
                ? "bg-primary text-primary-foreground"
                : "glass-panel text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title={mode.label}
          >
            <mode.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Zoom + controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button className="glass-panel w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Navigation className="w-4 h-4" />
        </button>
        <div className="glass-panel rounded-lg flex items-center">
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground px-1">40%</span>
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button className="glass-panel w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
