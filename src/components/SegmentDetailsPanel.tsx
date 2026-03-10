import { X, Train, Car, Bike, Footprints, Clock, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { TransportMode } from "@/components/MapPanel";

export interface TrainSegmentInfo {
  trainNumber?: string;
  trainName?: string;
  departureStation: string;
  arrivalStation: string;
  departureTime?: string;
  arrivalTime?: string;
  platform?: string;
  intermediateStops?: string[];
}

export interface RoadSegmentInfo {
  from: string;
  to: string;
  modes: {
    transport_mode: string;
    distance_km: number;
    duration_minutes: number;
  }[];
}

interface SegmentDetailsPanelProps {
  type: "train" | "road";
  trainInfo?: TrainSegmentInfo;
  roadInfo?: RoadSegmentInfo;
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  onClose: () => void;
}

const ROAD_MODES: { mode: TransportMode; icon: typeof Car; label: string; color: string }[] = [
  { mode: "car", icon: Car, label: "Car", color: "hsl(210,100%,60%)" },
  { mode: "bike", icon: Bike, label: "Bike", color: "hsl(142,70%,50%)" },
  { mode: "walk", icon: Footprints, label: "Walk", color: "hsl(32,95%,60%)" },
];

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SegmentDetailsPanel({
  type,
  trainInfo,
  roadInfo,
  selectedMode,
  onModeChange,
  onClose,
}: SegmentDetailsPanelProps) {
  if (type === "train" && trainInfo) {
    // Calculate duration from departure/arrival times
    let duration = "";
    if (trainInfo.departureTime && trainInfo.arrivalTime) {
      const [dH, dM] = trainInfo.departureTime.split(":").map(Number);
      const [aH, aM] = trainInfo.arrivalTime.split(":").map(Number);
      let mins = (aH * 60 + aM) - (dH * 60 + dM);
      if (mins < 0) mins += 24 * 60;
      duration = formatDuration(mins);
    }

    return (
      <motion.div
        className="absolute bottom-20 left-4 z-[1000] bg-[hsl(225,25%,11%)] border border-pink-500/30 shadow-2xl rounded-xl p-4 w-80 space-y-3"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-500/20">
              <Train className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground font-display block">
                {trainInfo.trainNumber || "Train"}
              </span>
              {trainInfo.trainName && (
                <span className="text-[11px] text-pink-400 font-medium">{trainInfo.trainName}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stations */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Departure</p>
              <p className="text-sm font-semibold text-foreground">{trainInfo.departureStation}</p>
              {trainInfo.departureTime && (
                <p className="text-xs text-pink-400 font-medium">{trainInfo.departureTime}</p>
              )}
            </div>
            {trainInfo.platform && (
              <div className="bg-pink-500/15 px-2 py-1 rounded text-[10px] font-semibold text-pink-400">
                PF {trainInfo.platform}
              </div>
            )}
          </div>

          {trainInfo.intermediateStops && trainInfo.intermediateStops.length > 0 && (
            <div className="pl-4 border-l-2 border-pink-500/20 ml-1 space-y-1">
              {trainInfo.intermediateStops.map((stop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400/50 flex-shrink-0" />
                  <span className="text-[11px] text-foreground/60">{stop}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-pink-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Arrival</p>
              <p className="text-sm font-semibold text-foreground">{trainInfo.arrivalStation}</p>
              {trainInfo.arrivalTime && (
                <p className="text-xs text-pink-400 font-medium">{trainInfo.arrivalTime}</p>
              )}
            </div>
          </div>
        </div>

        {/* Duration */}
        {duration && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground font-semibold">{duration}</span>
            <span className="text-muted-foreground">travel time</span>
          </div>
        )}
      </motion.div>
    );
  }

  // Road segment details
  if (type === "road" && roadInfo) {
    const currentModeData = roadInfo.modes.find((m) => m.transport_mode === selectedMode);

    return (
      <motion.div
        className="absolute bottom-20 left-4 z-[1000] bg-[hsl(225,25%,11%)] border border-glass-border shadow-2xl rounded-xl p-4 w-80 space-y-3"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground font-display">Road Route</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground font-medium truncate">{roadInfo.from}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground font-medium truncate">{roadInfo.to}</span>
        </div>

        {/* Current mode details */}
        {currentModeData && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated Time</span>
              <span className="text-sm font-bold text-foreground">{formatDuration(currentModeData.duration_minutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Distance</span>
              <span className="text-sm font-semibold text-foreground">{currentModeData.distance_km.toFixed(1)} km</span>
            </div>
          </div>
        )}

        {/* Mode switcher */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/40">
          {ROAD_MODES.map(({ mode, icon: Icon, label, color }) => {
            const modeData = roadInfo.modes.find((m) => m.transport_mode === mode);
            const isSelected = mode === selectedMode;
            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                  isSelected ? "bg-primary/15 border border-primary/30" : "hover:bg-muted/40 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" style={{ color: isSelected ? color : "hsl(215,20%,55%)" }} />
                <span className="text-[10px] font-semibold capitalize" style={{ color: isSelected ? color : undefined }}>
                  {label}
                </span>
                {modeData && (
                  <span className={`text-[10px] ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                    {formatDuration(modeData.duration_minutes)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return null;
}
