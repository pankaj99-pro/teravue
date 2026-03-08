import { motion } from "framer-motion";
import { MapPin, DollarSign } from "lucide-react";
import { toast } from "sonner";

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

interface ItineraryCardProps {
  item: ItineraryItem;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export function ItineraryCard({ item, isActive, onClick, index }: ItineraryCardProps) {
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`${item.buttonLabel} for "${item.title}" — opening soon!`);
  };

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      {/* Timeline marker */}
      <div className="flex flex-col items-center pt-2">
        <motion.div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isActive
              ? "bg-primary text-primary-foreground glow-primary"
              : "bg-muted text-muted-foreground border border-border"
          }`}
          animate={{
            scale: isActive ? 1.2 : 1,
            boxShadow: isActive
              ? "0 0 16px hsl(207 90% 54% / 0.5)"
              : "0 0 0px transparent",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {item.id}
        </motion.div>
        <div className="w-0.5 h-full bg-border mt-1.5 opacity-40" style={{ minHeight: 32 }} />
      </div>

      {/* Card */}
      <motion.div
        onClick={onClick}
        className={`flex-1 glass-panel rounded-xl p-3 cursor-pointer card-hover min-w-0 ${
          isActive ? "border-primary/40 bg-primary/5" : ""
        }`}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          borderColor: isActive ? "hsl(207 90% 54% / 0.4)" : "hsl(222 20% 22% / 1)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="flex gap-3 items-center">
          <motion.img
            src={item.image}
            alt={item.title}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          />

          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs text-muted-foreground">{item.time}</p>
            <h3 className="text-xs md:text-sm font-semibold text-foreground mt-0.5 truncate">{item.title}</h3>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] md:text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.location}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] md:text-xs h-4">
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
      </motion.div>
    </motion.div>
  );
}
