import { motion } from "framer-motion";
import { MapPin, DollarSign, Car, Bike, Train, Footprints, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { TransportMode } from "./MapPanel";

export interface ItineraryItem {
  id: number;
  time: string;
  title: string;
  location: string;
  price?: string;
  priceLabel?: string;
  buttonLabel: string;
  image: string;
}

export interface TravelSegment {
  from: string;
  to: string;
  modes: {
    transport_mode: string;
    distance_km: number;
    duration_minutes: number;
  }[];
}

interface ItineraryCardProps {
  item: ItineraryItem;
  isActive: boolean;
  onClick: () => void;
  index: number;
  isLast?: boolean;
  travelSegment?: TravelSegment;
  selectedMode: TransportMode;
}

const modeIcons: Record<string, typeof Car> = {
  car: Car,
  bike: Bike,
  walk: Footprints,
  train: Train,
};

const modeColors: Record<string, string> = {
  car: "text-primary",
  bike: "text-green-400",
  walk: "text-amber-400",
  train: "text-purple-400",
};

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ItineraryCard({ item, isActive, onClick, index, isLast, travelSegment, selectedMode }: ItineraryCardProps) {
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`${item.buttonLabel} for "${item.title}" — opening soon!`);
  };

  const modeData = travelSegment?.modes.find((m) => m.transport_mode === selectedMode);
  const TravelIcon = modeIcons[selectedMode] || Car;

  return (
    <div>
      <motion.div
        className="flex items-stretch gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      >
        {/* Timeline marker */}
        <div className="flex flex-col items-center flex-shrink-0 pt-3">
          <motion.div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              isActive
                ? "bg-primary text-primary-foreground glow-primary"
                : "bg-muted text-muted-foreground border border-border"
            }`}
            animate={{
              scale: isActive ? 1.2 : 1,
              boxShadow: isActive ? "0 0 16px hsl(207 90% 54% / 0.5)" : "0 0 0px transparent",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {item.id}
          </motion.div>
          {(!isLast || travelSegment) && (
            <div className="w-0.5 flex-1 bg-border opacity-40 mt-1.5" style={{ minHeight: 16 }} />
          )}
        </div>

        {/* Card */}
        <motion.div
          onClick={onClick}
          className={`flex-1 glass-panel rounded-xl p-3.5 cursor-pointer card-hover min-w-0 ${
            isActive ? "border-primary/40 bg-primary/5" : ""
          }`}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          animate={{
            borderColor: isActive ? "hsl(207 90% 54% / 0.4)" : "hsl(222 20% 22% / 1)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex gap-3">
            <motion.img
              src={item.image}
              alt={item.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">{item.time}</p>
              <h3 className="text-xs md:text-sm font-semibold text-foreground mt-0.5 leading-snug font-display">{item.title}</h3>
              <div className="flex items-center gap-1 mt-1 text-[10px] md:text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{item.location}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1 text-[10px] md:text-xs">
                  {item.price ? (
                    <>
                      <DollarSign className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-secondary font-medium">{item.price}</span>
                      {item.priceLabel && <span className="text-muted-foreground">{item.priceLabel}</span>}
                    </>
                  ) : (
                    item.priceLabel && <span className="text-muted-foreground">{item.priceLabel}</span>
                  )}
                </div>
                <motion.button
                  onClick={handleButtonClick}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-[10px] md:text-xs font-medium hover:bg-primary/10 transition-colors whitespace-nowrap"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.buttonLabel}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Travel segment between stops */}
      {travelSegment && modeData && (
        <motion.div
          className="flex items-stretch gap-3 py-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.2 }}
        >
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-0.5 flex-1 bg-border opacity-40" style={{ minHeight: 8 }} />
          </div>
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 flex-shrink-0">
              <TravelIcon className={`w-4 h-4 ${modeColors[selectedMode]}`} />
            </div>
            <ArrowDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="font-semibold text-foreground">{formatDuration(modeData.duration_minutes)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground font-medium">{modeData.distance_km.toFixed(1)} km</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
