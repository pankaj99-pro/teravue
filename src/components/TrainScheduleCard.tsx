import { motion } from "framer-motion";
import { Train, Clock, MapPin, ArrowRight, Circle } from "lucide-react";

interface TrainScheduleCardProps {
  trainNumber?: string;
  trainName?: string;
  departureTime?: string;
  arrivalTime?: string;
  fromLocation: string;
  toLocation: string;
  intermediateStops?: string[];
  platform?: string;
  price?: string;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export function TrainScheduleCard({
  trainNumber,
  trainName,
  departureTime,
  arrivalTime,
  fromLocation,
  toLocation,
  intermediateStops = [],
  platform,
  price,
  isActive,
  onClick,
  index,
}: TrainScheduleCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`glass-panel rounded-xl p-4 cursor-pointer card-hover border ${
        isActive ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Train header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Train className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {trainNumber || "Train"}
            </span>
            <span className="text-xs font-medium text-foreground truncate">
              {trainName || `${fromLocation} → ${toLocation}`}
            </span>
          </div>
        </div>
        {price && (
          <span className="text-xs font-semibold text-secondary flex-shrink-0">{price}</span>
        )}
      </div>

      {/* Departure / Arrival timeline */}
      <div className="flex items-stretch gap-3 ml-1">
        {/* Vertical track */}
        <div className="flex flex-col items-center gap-0.5 py-0.5">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-background" />
          <div className="w-0.5 flex-1 bg-border opacity-60" style={{ minHeight: 20 }} />
          {intermediateStops.length > 0 && intermediateStops.map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Circle className="w-1.5 h-1.5 text-muted-foreground fill-muted-foreground" />
              {i < intermediateStops.length - 1 && (
                <div className="w-0.5 bg-border opacity-40" style={{ height: 8 }} />
              )}
            </div>
          ))}
          {intermediateStops.length > 0 && (
            <div className="w-0.5 flex-1 bg-border opacity-60" style={{ minHeight: 8 }} />
          )}
          <div className="w-2.5 h-2.5 rounded-full border-2 border-secondary bg-background" />
        </div>

        {/* Station details */}
        <div className="flex-1 space-y-1">
          {/* Departure */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{fromLocation}</p>
              {departureTime && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Departs {departureTime}</span>
                </div>
              )}
            </div>
            {platform && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                Platform {platform}
              </span>
            )}
          </div>

          {/* Intermediate stops */}
          {intermediateStops.length > 0 && (
            <div className="py-1.5 pl-1">
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">
                Via {intermediateStops.length} stop{intermediateStops.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-1">
                {intermediateStops.map((stop, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded"
                  >
                    {stop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Arrival */}
          <div>
            <p className="text-sm font-semibold text-foreground">{toLocation}</p>
            {arrivalTime && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Arrives {arrivalTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
