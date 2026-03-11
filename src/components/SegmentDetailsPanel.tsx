import { X, Train, Car, Bike, Footprints, Clock, MapPin, ArrowRight, Navigation, Milestone, ChevronDown } from "lucide-react";
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

function TrainDetailsPanel({ trainInfo, onClose }: { trainInfo: TrainSegmentInfo; onClose: () => void }) {
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
      className="absolute bottom-20 left-4 z-[1000] w-[340px] overflow-hidden rounded-2xl border border-[hsl(330,60%,30%)] shadow-[0_8px_40px_hsl(330,80%,40%,0.2)]"
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-[hsl(330,50%,18%)] to-[hsl(330,40%,10%)] px-5 py-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(330,80%,60%,0.12),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(330,80%,60%,0.2)] ring-1 ring-[hsl(330,80%,60%,0.3)]">
              <Train className="h-5 w-5 text-[hsl(330,80%,65%)]" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground leading-tight">
                {trainInfo.trainNumber || "Train"}
              </p>
              {trainInfo.trainName && (
                <p className="text-xs font-medium text-[hsl(330,80%,65%)]">{trainInfo.trainName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[hsl(330,30%,20%)] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {duration && (
          <div className="relative mt-3 flex items-center gap-2 rounded-lg bg-[hsl(330,60%,60%,0.12)] px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-[hsl(330,80%,65%)]" />
            <span className="text-xs font-bold text-foreground">{duration}</span>
            <span className="text-xs text-muted-foreground">journey time</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="bg-card px-5 py-4 space-y-0">
        {/* Departure */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <div className="h-3.5 w-3.5 rounded-full bg-[hsl(330,80%,60%)] ring-4 ring-[hsl(330,80%,60%,0.15)]" />
            <div className="w-0.5 flex-1 bg-gradient-to-b from-[hsl(330,80%,60%)] to-[hsl(330,60%,40%,0.3)]" />
          </div>
          <div className="pb-4 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Departure</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{trainInfo.departureStation}</p>
            <div className="mt-1 flex items-center gap-2">
              {trainInfo.departureTime && (
                <span className="rounded-md bg-[hsl(330,80%,60%,0.12)] px-2 py-0.5 text-xs font-bold text-[hsl(330,80%,65%)]">
                  {trainInfo.departureTime}
                </span>
              )}
              {trainInfo.platform && (
                <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  Platform {trainInfo.platform}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Intermediate stops */}
        {trainInfo.intermediateStops && trainInfo.intermediateStops.length > 0 && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-0.5 flex-1 border-l-2 border-dashed border-[hsl(330,60%,40%,0.3)]" />
            </div>
            <div className="pb-3 flex-1">
              <div className="rounded-lg bg-accent/50 px-3 py-2 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Milestone className="h-3 w-3" />
                  {trainInfo.intermediateStops.length} Intermediate {trainInfo.intermediateStops.length === 1 ? "Stop" : "Stops"}
                </p>
                {trainInfo.intermediateStops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[hsl(330,60%,50%,0.6)]" />
                    <span className="text-xs text-foreground/70">{stop}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Arrival */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <div className="h-3.5 w-3.5 rounded-full border-[3px] border-[hsl(330,80%,60%)] bg-card" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Arrival</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{trainInfo.arrivalStation}</p>
            {trainInfo.arrivalTime && (
              <span className="mt-1 inline-block rounded-md bg-[hsl(330,80%,60%,0.12)] px-2 py-0.5 text-xs font-bold text-[hsl(330,80%,65%)]">
                {trainInfo.arrivalTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RoadDetailsPanel({
  roadInfo,
  selectedMode,
  onModeChange,
  onClose,
}: {
  roadInfo: RoadSegmentInfo;
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  onClose: () => void;
}) {
  const currentModeData = roadInfo.modes.find((m) => m.transport_mode === selectedMode);
  const currentConfig = ROAD_MODES.find((m) => m.mode === selectedMode);

  return (
    <motion.div
      className="absolute bottom-20 left-4 z-[1000] w-[340px] overflow-hidden rounded-2xl border border-border shadow-[0_8px_40px_hsl(210,100%,50%,0.12)]"
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-card to-[hsl(225,25%,8%)] px-5 py-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(210,100%,60%,0.08),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">Road Route</p>
              <p className="text-xs text-muted-foreground mt-0.5">Select transport mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Route */}
      <div className="bg-card px-5 py-4 space-y-4">
        <div className="flex items-center gap-2.5 rounded-lg bg-accent/60 px-3.5 py-2.5">
          <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate flex-1">{roadInfo.from}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate flex-1 text-right">{roadInfo.to}</span>
        </div>

        {/* Stats */}
        {currentModeData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-accent/40 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duration</p>
              <p className="mt-1 text-lg font-bold text-foreground font-display">{formatDuration(currentModeData.duration_minutes)}</p>
            </div>
            <div className="rounded-xl bg-accent/40 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Distance</p>
              <p className="mt-1 text-lg font-bold text-foreground font-display">{currentModeData.distance_km.toFixed(1)} km</p>
            </div>
          </div>
        )}

        {/* Mode switcher */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {ROAD_MODES.map(({ mode, icon: Icon, label, color }) => {
            const modeData = roadInfo.modes.find((m) => m.transport_mode === mode);
            const isSelected = mode === selectedMode;
            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl py-3 transition-all duration-200 ${
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_20px_hsl(210,100%,60%,0.08)]"
                    : "bg-accent/30 hover:bg-accent/60 ring-1 ring-transparent"
                }`}
              >
                <Icon className="h-5 w-5 transition-colors" style={{ color: isSelected ? color : "hsl(215,20%,50%)" }} />
                <span className="text-[11px] font-bold capitalize" style={{ color: isSelected ? color : undefined }}>
                  {label}
                </span>
                {modeData && (
                  <span className={`text-[10px] font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                    {formatDuration(modeData.duration_minutes)}
                  </span>
                )}
                {isSelected && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full"
                    style={{ background: color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
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
    return <TrainDetailsPanel trainInfo={trainInfo} onClose={onClose} />;
  }

  if (type === "road" && roadInfo) {
    return (
      <RoadDetailsPanel
        roadInfo={roadInfo}
        selectedMode={selectedMode}
        onModeChange={onModeChange}
        onClose={onClose}
      />
    );
  }

  return null;
}
