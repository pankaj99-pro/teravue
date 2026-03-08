import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, DollarSign, ChevronLeft, Plus, Download, Share2, MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";

interface TripInfo {
  destination: string;
  description: string;
  country: string;
  countryFlag: string;
  dateRange: string;
  travelers: string;
  avgBudget: string;
}

interface TripHeaderProps {
  selectedDay: number;
  onDayChange: (day: number) => void;
  days: number[];
  dayInfo: Record<number, { date: string; title: string }>;
  tripInfo: TripInfo;
}

const actionButtons = [
  { Icon: Plus, label: "Add activity" },
  { Icon: Download, label: "Download itinerary" },
  { Icon: Share2, label: "Share trip" },
  { Icon: MoreVertical, label: "More options" },
];

export function TripHeader({ selectedDay, onDayChange, days, dayInfo, tripInfo }: TripHeaderProps) {
  const info = dayInfo[selectedDay] || { date: "", title: "" };

  const handleAction = (label: string) => {
    toast.success(`${label} — coming soon!`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => toast.info("Navigating back to trips list…")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Itinerary Detail
        </button>
        <div className="flex items-center gap-1">
          {actionButtons.map(({ Icon, label }) => (
            <motion.button
              key={label}
              onClick={() => handleAction(label)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{tripInfo.destination}</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">{tripInfo.description}</p>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-base">{tripInfo.countryFlag}</span> {tripInfo.country}
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> {tripInfo.dateRange}
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> {tripInfo.travelers}
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> {tripInfo.avgBudget}
        </span>
      </div>

      {/* Day selector */}
      <div className="flex items-center gap-2 md:gap-3 relative overflow-x-auto scrollbar-hide">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
              selectedDay === day
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {selectedDay === day && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/15 border border-primary/30"
                layoutId="daySelector"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Day {day}</span>
          </button>
        ))}
      </div>

      {/* Day title - animated */}
      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-xs text-muted-foreground">{info.date}</p>
            <h2 className="text-base md:text-lg font-semibold text-foreground">{info.title}</h2>
          </motion.div>
        </AnimatePresence>
        <motion.button
          onClick={() => toast.info("Edit mode — coming soon!")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Edit day"
        >
          <Pencil className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
