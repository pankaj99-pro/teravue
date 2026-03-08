import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, DollarSign, ChevronLeft, Plus, Download, Share2, MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";

interface TripHeaderProps {
  selectedDay: number;
  onDayChange: (day: number) => void;
}

const dayInfo: Record<number, { date: string; title: string }> = {
  1: { date: "October 12", title: "Arrival & Exploration" },
  2: { date: "October 13", title: "Ancient Rome Tour" },
  3: { date: "October 14", title: "Vatican & Museums" },
  4: { date: "October 15", title: "Trastevere & Food Tour" },
  5: { date: "October 16", title: "Departure Day" },
};

const actionButtons = [
  { Icon: Plus, label: "Add activity" },
  { Icon: Download, label: "Download itinerary" },
  { Icon: Share2, label: "Share trip" },
  { Icon: MoreVertical, label: "More options" },
];

export function TripHeader({ selectedDay, onDayChange }: TripHeaderProps) {
  const days = [1, 2, 3, 4, 5];
  const info = dayInfo[selectedDay];

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
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Rome Getaway — 5 Days Trip</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          A 5-day escape through Rome's timeless landmarks, local cuisine, and hidden gems.
        </p>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-base">🇮🇹</span> Italy
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Oct 12–16
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> 2 Adults
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> $1,200.00 Avg.
        </span>
      </div>

      {/* Day selector */}
      <div className="flex items-center gap-2 md:gap-3 relative">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
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
