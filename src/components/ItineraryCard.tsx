import { MapPin, DollarSign } from "lucide-react";

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
}

export function ItineraryCard({ item, isActive, onClick }: ItineraryCardProps) {
  return (
    <div className="flex items-start gap-4">
      {/* Timeline marker */}
      <div className="flex flex-col items-center pt-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            isActive
              ? "bg-primary text-primary-foreground glow-primary animate-pulse-glow"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {item.id}
        </div>
        <div className="w-0.5 h-full bg-border mt-2 opacity-40" style={{ minHeight: 40 }} />
      </div>

      {/* Card */}
      <div
        onClick={onClick}
        className={`flex-1 glass-panel rounded-xl p-3 cursor-pointer card-hover ${
          isActive ? "border-primary/40 bg-primary/5" : ""
        }`}
      >
        <div className="flex gap-3">
          {/* Image */}
          <img
            src={item.image}
            alt={item.title}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{item.time}</p>
            <h3 className="text-sm font-semibold text-foreground mt-0.5 truncate">{item.title}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.location}</span>
            </div>
            {item.price && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <DollarSign className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-secondary font-medium">{item.price}</span>
                {item.priceLabel && <span className="text-muted-foreground">{item.priceLabel}</span>}
              </div>
            )}
          </div>

          {/* Button */}
          <button className="self-center flex-shrink-0 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-medium hover:bg-primary/10 transition-all duration-200 whitespace-nowrap">
            {item.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
