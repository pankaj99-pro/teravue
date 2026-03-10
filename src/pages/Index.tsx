import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TripHeader } from "@/components/TripHeader";
import { ItineraryCard, ItineraryItem, TravelSegment } from "@/components/ItineraryCard";
import { TrainScheduleCard } from "@/components/TrainScheduleCard";
import { MapPanel, TransportMode, RouteSegment } from "@/components/MapPanel";
import { useItinerary } from "@/contexts/ItineraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { loadFullTrip, loadTripsFromDatabase } from "@/lib/tripStorage";
import { supabase } from "@/integrations/supabase/client";

import airportImg from "@/assets/airport.jpg";
import hotelImg from "@/assets/hotel.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import colosseumImg from "@/assets/colosseum.jpg";

const imageMap: Record<string, string> = {
  airport: airportImg,
  hotel: hotelImg,
  restaurant: restaurantImg,
  landmark: colosseumImg,
  activity: colosseumImg,
  transport: airportImg,
};

export default function Index() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeStop, setActiveStop] = useState(1);
  const [viewMode, setViewMode] = useState<"itinerary" | "map">("itinerary");
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [dbRoutes, setDbRoutes] = useState<any[]>([]);
  const [isHydratingLatestTrip, setIsHydratingLatestTrip] = useState(true);

  const { user } = useAuth();
  const { tripPlan, setTripPlan } = useItinerary();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const hydrateLatestTrip = async () => {
      if (tripPlan) {
        setIsHydratingLatestTrip(false);
        return;
      }

      if (!user) {
        setIsHydratingLatestTrip(false);
        return;
      }

      setIsHydratingLatestTrip(true);
      const trips = await loadTripsFromDatabase(user.id);
      const latestTripId = trips?.[0]?.id;

      if (!latestTripId) {
        if (!cancelled) setIsHydratingLatestTrip(false);
        return;
      }

      const latestPlan = await loadFullTrip(latestTripId);
      if (!cancelled && latestPlan) {
        setTripPlan(latestPlan);
        setSelectedDay(latestPlan.days[0]?.day ?? 1);
        setActiveStop(latestPlan.days[0]?.stops[0]?.id ?? 1);
      }

      if (!cancelled) setIsHydratingLatestTrip(false);
    };

    hydrateLatestTrip();

    return () => {
      cancelled = true;
    };
  }, [tripPlan, user, setTripPlan]);

  useEffect(() => {
    if (!tripPlan?.tripId) {
      setDbRoutes([]);
      return;
    }

    const fetchRoutes = async () => {
      const { data } = await supabase
        .from("trip_routes")
        .select("*")
        .eq("trip_id", tripPlan.tripId);
      setDbRoutes(data ?? []);
    };

    fetchRoutes();
  }, [tripPlan?.tripId]);

  const hasTrip = Boolean(tripPlan && tripPlan.days.length > 0);

  const days = useMemo(() => {
    if (!tripPlan) return [];
    return tripPlan.days.map((d) => d.day);
  }, [tripPlan]);

  useEffect(() => {
    if (!hasTrip || days.length === 0) return;
    if (!days.includes(selectedDay)) {
      const firstDay = days[0];
      setSelectedDay(firstDay);
      const firstStopId = tripPlan?.days.find((d) => d.day === firstDay)?.stops[0]?.id ?? 1;
      setActiveStop(firstStopId);
    }
  }, [hasTrip, days, selectedDay, tripPlan]);

  const currentDayPlan = useMemo(() => {
    if (!tripPlan) return null;
    return tripPlan.days.find((d) => d.day === selectedDay) ?? tripPlan.days[0] ?? null;
  }, [tripPlan, selectedDay]);

  const dayInfo = useMemo(() => {
    const info: Record<number, { date: string; title: string }> = {};
    for (const day of tripPlan?.days ?? []) {
      info[day.day] = { date: day.date, title: day.title };
    }
    return info;
  }, [tripPlan]);

  const currentItems: ItineraryItem[] = useMemo(() => {
    if (!currentDayPlan) return [];
    return currentDayPlan.stops.map((stop) => ({
      ...stop,
      image: imageMap[stop.image] || colosseumImg,
    }));
  }, [currentDayPlan]);

  const mapStops = useMemo(() => {
    if (!currentDayPlan) return [];
    return currentDayPlan.stops
      .filter((s) => s.lat != null && s.lng != null && isFinite(s.lat!) && isFinite(s.lng!))
      .map((s) => ({
        id: s.id,
        label: s.title,
        lat: s.lat!,
        lng: s.lng!,
        img: imageMap[s.image] || colosseumImg,
        activityType: s.image, // pass activity type for flight detection
      }));
  }, [currentDayPlan]);

  const routeSegments: RouteSegment[] = useMemo(() => {
    if (!tripPlan || !currentDayPlan) return [];

    if (dbRoutes.length > 0) {
      const segMap = new Map<string, RouteSegment>();
      for (const r of dbRoutes) {
        const key = `${r.from_location}→${r.to_location}`;
        if (!segMap.has(key)) {
          segMap.set(key, { from: r.from_location, to: r.to_location, modes: [] });
        }

        let polyline: [number, number][] | undefined;
        if (r.route_polyline) {
          try {
            polyline = JSON.parse(r.route_polyline);
          } catch {
            polyline = undefined;
          }
        }

        segMap.get(key)!.modes.push({
          transport_mode: r.transport_mode,
          distance_km: r.distance_km || 0,
          duration_minutes: r.duration_minutes || 0,
          polyline,
        });
      }
      return Array.from(segMap.values());
    }

    if (currentDayPlan.stops.length < 2) return [];

    const segs: RouteSegment[] = [];
    for (let i = 0; i < currentDayPlan.stops.length - 1; i++) {
      const from = currentDayPlan.stops[i];
      const to = currentDayPlan.stops[i + 1];

      if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) continue;

      const R = 6371;
      const dLat = ((to.lat - from.lat) * Math.PI) / 180;
      const dLng = ((to.lng - from.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((from.lat * Math.PI) / 180) *
          Math.cos((to.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const km = Math.round(dist * 10) / 10;

      segs.push({
        from: from.title,
        to: to.title,
        modes: [
          { transport_mode: "car", distance_km: km * 1.3, duration_minutes: Math.max(3, Math.round((km * 1.3) / 0.6)) },
          { transport_mode: "bike", distance_km: km * 1.2, duration_minutes: Math.max(4, Math.round((km * 1.2) / 0.25)) },
          { transport_mode: "walk", distance_km: km, duration_minutes: Math.max(5, Math.round(km / 0.08)) },
          { transport_mode: "train", distance_km: km * 1.4, duration_minutes: Math.max(5, Math.round((km * 1.4) / 0.8)) },
        ],
      });
    }

    return segs;
  }, [tripPlan, currentDayPlan, dbRoutes]);

  const travelSegments: TravelSegment[] = useMemo(() => {
    return routeSegments.map((seg) => ({
      from: seg.from,
      to: seg.to,
      modes: seg.modes.map((m) => ({
        transport_mode: m.transport_mode,
        distance_km: m.distance_km,
        duration_minutes: m.duration_minutes,
      })),
    }));
  }, [routeSegments]);

  const headerProps = useMemo(() => {
    if (!tripPlan) return null;

    return {
      destination: `${tripPlan.destination} Getaway — ${tripPlan.totalDays} Days Trip`,
      description: `AI-planned trip to ${tripPlan.destination}, ${tripPlan.country}`,
      country: tripPlan.country,
      countryFlag: tripPlan.countryFlag,
      dateRange: tripPlan.dateRange,
      travelers: tripPlan.travelers,
      avgBudget: tripPlan.avgBudget,
    };
  }, [tripPlan]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="md:hidden fixed top-16 left-0 right-0 z-40 glass-navbar flex">
        {(["itinerary", "map"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              viewMode === mode ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="flex-1 pt-16 flex flex-col md:flex-row overflow-hidden">
        <div
          className={`w-full md:w-[42%] lg:w-[38%] border-r border-border overflow-y-auto scrollbar-hide ${
            viewMode === "map" ? "hidden md:block" : ""
          }`}
          style={{ marginTop: viewMode === "itinerary" ? "2.75rem" : 0 }}
        >
          {isHydratingLatestTrip ? (
            <div className="px-6 py-16 text-center space-y-2">
              <h1 className="text-lg font-semibold text-foreground">Loading your latest itinerary…</h1>
              <p className="text-sm text-muted-foreground">Syncing trip details from your backend.</p>
            </div>
          ) : !hasTrip || !headerProps ? (
            <div className="px-6 py-16 text-center space-y-4">
              <h1 className="text-xl font-semibold text-foreground">No itinerary loaded</h1>
              <p className="text-sm text-muted-foreground">Create a trip in AI Chat or open one from My Trips to populate every section dynamically.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/chat")}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Open AI Chat
                </button>
                <button
                  onClick={() => navigate("/trips")}
                  className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
                >
                  Open My Trips
                </button>
              </div>
            </div>
          ) : (
            <>
              <TripHeader
                selectedDay={selectedDay}
                onDayChange={(day) => {
                  setSelectedDay(day);
                  const firstStopId = tripPlan?.days.find((d) => d.day === day)?.stops[0]?.id ?? 1;
                  setActiveStop(firstStopId);
                }}
                days={days}
                dayInfo={dayInfo}
                tripInfo={headerProps}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDay}
                  className="px-4 md:px-6 pb-8 space-y-1"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentItems.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
                      No activities found for this day.
                    </div>
                  ) : (
                    currentItems.map((item, i) => (
                      <ItineraryCard
                        key={item.id}
                        item={item}
                        isActive={activeStop === item.id}
                        onClick={() => setActiveStop(item.id)}
                        index={i}
                        isLast={i === currentItems.length - 1}
                        selectedMode={transportMode}
                        travelSegment={travelSegments[i] || undefined}
                      />
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>

        <div
          className={`flex-1 ${viewMode === "itinerary" ? "hidden md:block" : ""}`}
          style={{ marginTop: viewMode === "map" ? "2.75rem" : 0 }}
        >
          <MapPanel
            activeStop={activeStop}
            customStops={mapStops}
            dayTitle={currentDayPlan?.title}
            routeSegments={routeSegments}
            selectedMode={transportMode}
            onModeChange={setTransportMode}
          />
        </div>
      </div>
    </div>
  );
}

