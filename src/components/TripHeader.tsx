import { Calendar, Users, DollarSign, ChevronLeft, Plus, Download, Share2, MoreVertical, Pencil } from "lucide-react";

interface TripHeaderProps {
  selectedDay: number;
  onDayChange: (day: number) => void;
}

export function TripHeader({ selectedDay, onDayChange }: TripHeaderProps) {
  const days = [1, 2, 3, 4, 5];

  return (
    <div className="p-6 space-y-5">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Itinerary Detail
        </button>
        <div className="flex items-center gap-2">
          {[Plus, Download, Share2, MoreVertical].map((Icon, i) => (
            <button key={i} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rome Getaway — 5 Days Trip</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          A 5-day escape through Rome's timeless landmarks, local cuisine, and hidden gems — from the Colosseum to charming Trastevere.
        </p>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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

      {/* Day selector + label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => onDayChange(day)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                selectedDay === day
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>
      </div>

      {/* Day title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">October 12</p>
          <h2 className="text-lg font-semibold text-foreground">Arrival & Exploration</h2>
        </div>
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
