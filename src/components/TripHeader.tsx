import { useEffect, useRef } from "react";
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

// Particle canvas for premium ambient effect
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number; hue: number }[] = [];
    const count = 40;
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.15 - 0.1,
        r: Math.random() * 2 + 0.5,
        o: Math.random() * 0.35 + 0.05,
        hue: Math.random() > 0.5 ? 210 : 168,
      });
    }

    const draw = () => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = r.width + 10;
        if (p.x > r.width + 10) p.x = -10;
        if (p.y < -10) p.y = r.height + 10;
        if (p.y > r.height + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.o})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export function TripHeader({ selectedDay, onDayChange, days, dayInfo, tripInfo }: TripHeaderProps) {
  const info = dayInfo[selectedDay] || { date: "", title: "" };

  const handleAction = (label: string) => {
    toast.success(`${label} — coming soon!`);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 30%, hsla(210, 100%, 60%, 0.12) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at 80% 60%, hsla(168, 70%, 50%, 0.08) 0%, transparent 70%),
              radial-gradient(ellipse 90% 40% at 50% 100%, hsla(270, 60%, 55%, 0.06) 0%, transparent 60%)
            `,
            animation: "gradient-shift 8s ease-in-out infinite alternate",
          }}
        />
        <ParticleCanvas />
        {/* Subtle mesh line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(210 100% 60% / 0.2), hsl(168 70% 50% / 0.15), transparent)",
          }}
        />
      </div>

      <div className="relative z-10 p-4 md:p-6 space-y-4">
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
          <motion.h1
            className="text-xl md:text-2xl font-bold text-foreground font-display"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {tripInfo.destination}
          </motion.h1>
          <motion.p
            className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {tripInfo.description}
          </motion.p>
        </div>

        {/* Metadata */}
        <motion.div
          className="flex flex-wrap items-center gap-3 text-xs md:text-sm"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <span className="flex items-center gap-1.5 text-foreground/80">
            <span className="text-base">{tripInfo.countryFlag}</span> {tripInfo.country}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="flex items-center gap-1.5 text-foreground/80">
            <Calendar className="w-3.5 h-3.5 text-primary/70" /> {tripInfo.dateRange}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="flex items-center gap-1.5 text-foreground/80">
            <Users className="w-3.5 h-3.5 text-primary/70" /> {tripInfo.travelers}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="flex items-center gap-1.5 text-foreground/80">
            <DollarSign className="w-3.5 h-3.5 text-secondary/70" /> {tripInfo.avgBudget}
          </span>
        </motion.div>

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
              <h2 className="text-base md:text-lg font-semibold text-foreground font-display">{info.title}</h2>
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
    </div>
  );
}
