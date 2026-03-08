import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, DollarSign, Trash2, Eye, Plane, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useItinerary } from "@/contexts/ItineraryContext";
import { loadTripsFromDatabase, loadFullTrip, deleteTrip } from "@/lib/tripStorage";
import { toast } from "sonner";

interface TripRow {
  id: string;
  title: string;
  destination_city: string | null;
  destination_country: string | null;
  start_date: string | null;
  end_date: string | null;
  estimated_budget: number | null;
  travelers_count: number | null;
  ai_generated: boolean | null;
  created_at: string;
}

export default function TripHistory() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const { user } = useAuth();
  const { setTripPlan } = useItinerary();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadTripsFromDatabase(user.id).then((data) => {
      setTrips(data as TripRow[]);
      setLoading(false);
    });
  }, [user]);

  const handleView = async (tripId: string) => {
    setLoadingTripId(tripId);
    const plan = await loadFullTrip(tripId);
    setLoadingTripId(null);
    if (plan) {
      setTripPlan(plan);
      navigate("/");
      toast.success("Trip loaded!");
    } else {
      toast.error("Failed to load trip");
    }
  };

  const handleDelete = async (tripId: string) => {
    const ok = await deleteTrip(tripId);
    if (ok) {
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      toast.success("Trip deleted");
    } else {
      toast.error("Failed to delete trip");
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Plane className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold text-foreground font-display">Sign in to view your trips</h2>
            <p className="text-sm text-muted-foreground">Your trip history will appear here after signing in.</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 pt-16 overflow-y-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display">Trip History</h1>
            <p className="text-sm text-muted-foreground mt-1">Your saved trips and AI-generated itineraries</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : trips.length === 0 ? (
            <motion.div
              className="glass-panel rounded-xl p-12 text-center space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Plane className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold text-foreground font-display">No trips yet</h3>
              <p className="text-sm text-muted-foreground">Head to AI Chat to plan your first trip!</p>
              <button
                onClick={() => navigate("/chat")}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Plan a Trip
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {trips.map((trip, i) => (
                  <motion.div
                    key={trip.id}
                    className="glass-panel rounded-xl p-5 card-hover"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground font-display truncate">
                            {trip.title}
                          </h3>
                          {trip.ai_generated && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium border border-primary/30">
                              AI
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {trip.destination_city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary/70" />
                              {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ""}
                            </span>
                          )}
                          {trip.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary/70" />
                              {new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                            </span>
                          )}
                          {trip.travelers_count && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-primary/70" />
                              {trip.travelers_count} travelers
                            </span>
                          )}
                          {trip.estimated_budget && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-secondary/70" />
                              ${trip.estimated_budget.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground/60">
                          Created {new Date(trip.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.button
                          onClick={() => handleView(trip.id)}
                          disabled={loadingTripId === trip.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {loadingTripId === trip.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          View
                        </motion.button>
                        <motion.button
                          onClick={() => handleDelete(trip.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
