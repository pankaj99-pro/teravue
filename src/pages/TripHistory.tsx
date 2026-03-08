import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Calendar, Users, DollarSign, Trash2, Eye, Plane, Loader2,
  Bookmark, BookmarkCheck, Sparkles, Globe, ArrowRight, Clock, Search,
  SortAsc, Filter,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useItinerary } from "@/contexts/ItineraryContext";
import { loadTripsFromDatabase, loadFullTrip, deleteTrip } from "@/lib/tripStorage";
import { supabase } from "@/integrations/supabase/client";
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

const destinationImages: Record<string, string> = {
  Tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=300&fit=crop",
  Paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=300&fit=crop",
  Rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=300&fit=crop",
  Bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=300&fit=crop",
  Santorini: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=300&fit=crop",
  London: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=300&fit=crop",
  "New York": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop",
  Dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=300&fit=crop",
  Bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&h=300&fit=crop",
  Sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&h=300&fit=crop",
};

const defaultImage = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop";

function getTripImage(city: string | null): string {
  if (!city) return defaultImage;
  const key = Object.keys(destinationImages).find((k) => city.toLowerCase().includes(k.toLowerCase()));
  return key ? destinationImages[key] : defaultImage;
}

function getDayCount(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

export default function TripHistory() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [savedTripIds, setSavedTripIds] = useState<Set<string>>(new Set());
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "budget">("newest");
  const { user } = useAuth();
  const { setTripPlan } = useItinerary();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      loadTripsFromDatabase(user.id),
      supabase.from("saved_trips").select("id, title").eq("user_id", user.id),
    ]).then(([tripData, savedData]) => {
      setTrips(tripData as TripRow[]);
      if (savedData.data) {
        // Match by title to know which trips are already saved to profile
        const savedTitles = new Set(savedData.data.map((s: any) => s.title));
        const ids = new Set<string>();
        (tripData as TripRow[]).forEach((t) => {
          if (savedTitles.has(t.title)) ids.add(t.id);
        });
        setSavedTripIds(ids);
      }
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

  const handleSaveToProfile = async (trip: TripRow) => {
    if (!user) return;
    setSavingTripId(trip.id);

    // Load full trip to get stops data
    const fullTrip = await loadFullTrip(trip.id);
    const stops = fullTrip?.days.flatMap((d) =>
      d.stops.map((s) => ({ title: s.title, location: s.location, time: s.time, day: d.day }))
    ) || [];

    const { error } = await supabase.from("saved_trips").insert({
      user_id: user.id,
      title: trip.title,
      destination: `${trip.destination_city || ""}${trip.destination_country ? `, ${trip.destination_country}` : ""}`,
      stops,
    });

    setSavingTripId(null);
    if (error) {
      toast.error("Failed to save to profile");
    } else {
      setSavedTripIds((prev) => new Set(prev).add(trip.id));
      toast.success("Trip saved to profile! 🔖");
    }
  };

  const handleUnsaveFromProfile = async (trip: TripRow) => {
    if (!user) return;
    setSavingTripId(trip.id);
    await supabase.from("saved_trips").delete().eq("user_id", user.id).eq("title", trip.title);
    setSavingTripId(null);
    setSavedTripIds((prev) => {
      const next = new Set(prev);
      next.delete(trip.id);
      return next;
    });
    toast.info("Removed from profile");
  };

  const filtered = trips
    .filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.destination_city || "").toLowerCase().includes(q) ||
        (t.destination_country || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "budget") return (b.estimated_budget || 0) - (a.estimated_budget || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (!user) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 pt-16 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mx-auto">
              <Plane className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sign in to view your trips</h2>
            <p className="text-sm text-muted-foreground max-w-sm">Your AI-generated itineraries and saved trips will appear here.</p>
            <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto">
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex-1 pt-16 overflow-y-auto scrollbar-hide">
        {/* Hero section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 30%, hsl(var(--secondary) / 0.08) 0%, transparent 50%)",
          }} />
          <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-14">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                My Trips
              </h1>
              <p className="text-muted-foreground max-w-lg">
                All your AI-generated itineraries in one place. Save your favorites to your profile for quick access.
              </p>

              {/* Stats row */}
              {trips.length > 0 && (
                <div className="flex gap-3 pt-2">
                  {[
                    { label: "Total Trips", value: trips.length, icon: Plane },
                    { label: "Saved", value: savedTripIds.size, icon: Bookmark },
                    { label: "Countries", value: new Set(trips.map((t) => t.destination_country).filter(Boolean)).size, icon: Globe },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                      <stat.icon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-12 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Loading your trips…</span>
              </motion.div>
            </div>
          ) : trips.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-12 text-center space-y-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No trips yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Start a conversation with our AI travel planner to generate your first itinerary. It only takes a minute!
              </p>
              <button onClick={() => navigate("/chat")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto">
                <Sparkles className="w-4 h-4" /> Plan Your First Trip
              </button>
            </motion.div>
          ) : (
            <>
              {/* Search & Sort */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 glass-panel rounded-xl flex items-center gap-3 px-4 py-2.5">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search trips by destination…"
                    className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
                  />
                </div>
                <div className="glass-panel rounded-xl flex items-center gap-2 px-3">
                  <SortAsc className="w-4 h-4 text-muted-foreground" />
                  {(["newest", "oldest", "budget"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        sortBy === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Trip cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AnimatePresence>
                  {filtered.map((trip, i) => {
                    const dayCount = getDayCount(trip.start_date, trip.end_date);
                    const isSaved = savedTripIds.has(trip.id);
                    const imageUrl = getTripImage(trip.destination_city);

                    return (
                      <motion.div
                        key={trip.id}
                        className="glass-panel rounded-2xl overflow-hidden card-hover group"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ y: -3 }}
                      >
                        {/* Image header */}
                        <div className="relative h-36 overflow-hidden">
                          <img src={imageUrl} alt={trip.destination_city || trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            {trip.ai_generated && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI Generated
                              </span>
                            )}
                            {dayCount && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-sm text-white">
                                {dayCount} days
                              </span>
                            )}
                          </div>

                          {/* Save button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              isSaved ? handleUnsaveFromProfile(trip) : handleSaveToProfile(trip);
                            }}
                            disabled={savingTripId === trip.id}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                            title={isSaved ? "Remove from profile" : "Save to profile"}
                          >
                            {savingTripId === trip.id ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : isSaved ? (
                              <BookmarkCheck className="w-4 h-4 text-secondary fill-secondary" />
                            ) : (
                              <Bookmark className="w-4 h-4 text-foreground" />
                            )}
                          </button>

                          {/* Destination name on image */}
                          <div className="absolute bottom-3 left-3">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              <MapPin className="w-4 h-4 text-primary" />
                              {trip.destination_city || "Adventure"}
                            </h3>
                            {trip.destination_country && (
                              <p className="text-xs text-muted-foreground ml-5.5">{trip.destination_country}</p>
                            )}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground truncate">{trip.title}</p>

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {trip.start_date && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/50">
                                <Calendar className="w-3 h-3 text-primary/70" />
                                {new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                              </span>
                            )}
                            {trip.travelers_count && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/50">
                                <Users className="w-3 h-3 text-primary/70" />
                                {trip.travelers_count}
                              </span>
                            )}
                            {trip.estimated_budget != null && trip.estimated_budget > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/50">
                                <DollarSign className="w-3 h-3 text-secondary/70" />
                                ${trip.estimated_budget.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(trip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={() => handleView(trip.id)}
                                disabled={loadingTripId === trip.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
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
                                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Delete trip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {filtered.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No trips matching "{searchQuery}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
