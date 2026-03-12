import { X, Train, Car, Bike, Footprints, Clock, Milestone, Navigation, Lock } from "lucide-react";
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
  isFixed?: boolean; // true for train/flight - no mode switching
}

const ROAD_MODES: { mode: TransportMode; icon: typeof Car; label: string; color: string }[] = [
  { mode: "car", icon: Car, label: "Car", color: "#FACC15" },
  { mode: "bike", icon: Bike, label: "Bike", color: "#F97316" },
  { mode: "walk", icon: Footprints, label: "Walk", color: "#22C55E" },
];

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TrainDetailsPanel({ trainInfo, onClose, isFixed }: { trainInfo: TrainSegmentInfo; onClose: () => void; isFixed?: boolean }) {
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
      className="absolute bottom-20 left-2 sm:left-4 z-[1000] w-[calc(100%-1rem)] sm:w-[340px] max-w-[95vw] overflow-hidden rounded-2xl border shadow-xl"
      style={{ borderColor: "#2563EB40" }}
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="relative px-4 sm:px-5 py-4" style={{ background: "linear-gradient(135deg, #1e3a5f, #0f172a)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: "#2563EB25", boxShadow: "0 0 0 1px #2563EB40" }}>
              <Train className="h-5 w-5" style={{ color: "#60a5fa" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-foreground leading-tight truncate">
                {trainInfo.trainNumber || "Train"}
              </p>
              {trainInfo.trainName && (
                <p className="text-xs font-medium truncate" style={{ color: "#60a5fa" }}>{trainInfo.trainName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {isFixed && (
              <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground bg-accent/60" title="Fixed segment — cannot switch mode">
                <Lock className="h-3 w-3" />
                Fixed
              </div>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {duration && (
          <div className="relative mt-3 flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "#2563EB18" }}>
            <Clock className="h-3.5 w-3.5" style={{ color: "#60a5fa" }} />
            <span className="text-xs font-bold text-foreground">{duration}</span>
            <span className="text-xs text-muted-foreground">journey time</span>
          </div>
        )}
      </div>

      {/* Stations */}
      <div className="bg-card px-4 sm:px-5 py-4 space-y-0">
        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1 flex-shrink-0">
            <div className="h-3.5 w-3.5 rounded-full" style={{ background: "#2563EB", boxShadow: "0 0 0 4px #2563EB22" }} />
            <div className="w-0.5 flex-1" style={{ background: "linear-gradient(to bottom, #2563EB, #2563EB30)" }} />
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Departure</p>
            <p className="text-sm font-bold text-foreground mt-0.5 break-words">{trainInfo.departureStation}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {trainInfo.departureTime && (
                <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: "#2563EB18", color: "#60a5fa" }}>
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

        {trainInfo.intermediateStops && trainInfo.intermediateStops.length > 0 && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-0.5 flex-1 border-l-2 border-dashed" style={{ borderColor: "#2563EB40" }} />
            </div>
            <div className="pb-3 flex-1 min-w-0">
              <div className="rounded-lg bg-accent/50 px-3 py-2 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Milestone className="h-3 w-3" />
                  {trainInfo.intermediateStops.length} Intermediate {trainInfo.intermediateStops.length === 1 ? "Stop" : "Stops"}
                </p>
                {trainInfo.intermediateStops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#2563EB80" }} />
                    <span className="text-xs text-foreground/70">{stop}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1 flex-shrink-0">
            <div className="h-3.5 w-3.5 rounded-full border-[3px] bg-card" style={{ borderColor: "#2563EB" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Arrival</p>
            <p className="text-sm font-bold text-foreground mt-0.5 break-words">{trainInfo.arrivalStation}</p>
            {trainInfo.arrivalTime && (
              <span className="mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: "#2563EB18", color: "#60a5fa" }}>
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
      className="absolute bottom-20 left-2 sm:left-4 z-[1000] w-[calc(100%-1rem)] sm:w-[360px] max-w-[95vw] overflow-hidden rounded-2xl border border-border shadow-xl"
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="relative bg-gradient-to-br from-card to-[hsl(225,25%,8%)] px-4 sm:px-5 py-4">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: (currentConfig?.color || "#FACC15") + "20", boxShadow: `0 0 0 1px ${currentConfig?.color || "#FACC15"}40` }}>
              <Navigation className="h-5 w-5" style={{ color: currentConfig?.color || "#FACC15" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-foreground">Road Route</p>
              <p className="text-xs text-muted-foreground mt-0.5">Select transport mode</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground flex-shrink-0 ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-card px-4 sm:px-5 py-4 space-y-4">
        {/* Route */}
        <div className="rounded-lg bg-accent/60 px-3.5 py-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: currentConfig?.color || "#FACC15" }} />
              <div className="w-0.5 h-5 mt-0.5" style={{ background: (currentConfig?.color || "#FACC15") + "40" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">From</p>
              <p className="text-sm font-semibold text-foreground break-words leading-snug">{roadInfo.from}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full border-2 bg-card" style={{ borderColor: currentConfig?.color || "#FACC15" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">To</p>
              <p className="text-sm font-semibold text-foreground break-words leading-snug">{roadInfo.to}</p>
            </div>
          </div>
        </div>

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

        {/* Mode switcher - only Car/Bike/Walk, no train */}
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
                    ? "ring-1 shadow-md"
                    : "bg-accent/30 hover:bg-accent/60 ring-1 ring-transparent"
                }`}
                style={isSelected ? { background: color + "18", boxShadow: `0 0 0 1px ${color}40, 0 0 20px ${color}15` } : undefined}
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
  isFixed,
}: SegmentDetailsPanelProps) {
  if (type === "train" && trainInfo) {
    return <TrainDetailsPanel trainInfo={trainInfo} onClose={onClose} isFixed={isFixed} />;
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
