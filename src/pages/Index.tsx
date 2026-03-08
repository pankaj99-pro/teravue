import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { TripHeader } from "@/components/TripHeader";
import { ItineraryCard, ItineraryItem, TravelSegment } from "@/components/ItineraryCard";
import { MapPanel, TransportMode, RouteSegment } from "@/components/MapPanel";
import { useItinerary } from "@/contexts/ItineraryContext";
import { supabase } from "@/integrations/supabase/client";

import airportImg from "@/assets/airport.jpg";
import hotelImg from "@/assets/hotel.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import colosseumImg from "@/assets/colosseum.jpg";

// Image map for AI-generated stops
const imageMap: Record<string, string> = {
  airport: airportImg,
  hotel: hotelImg,
  restaurant: restaurantImg,
  landmark: colosseumImg,
  activity: colosseumImg,
  transport: airportImg,
};

// Default demo data
const defaultDayInfo: Record<number, { date: string; title: string }> = {
  1: { date: "October 12", title: "Arrival & Exploration" },
  2: { date: "October 13", title: "Ancient Rome Tour" },
  3: { date: "October 14", title: "Vatican & Museums" },
  4: { date: "October 15", title: "Trastevere & Food Tour" },
  5: { date: "October 16", title: "Departure Day" },
};

const defaultItems: ItineraryItem[] = [
  { id: 1, time: "10:30 AM", title: "Fiumicino Airport (Arrival)", location: "Leonardo da Vinci Intl. Airport", priceLabel: "Included in Flight Ticket", buttonLabel: "Book a Flight", image: airportImg },
  { id: 2, time: "12:00 PM", title: "Albergo Roma (Hotel Check-in)", location: "City Center, Rome", price: "$130.00", priceLabel: "per night", buttonLabel: "View Booking", image: hotelImg },
  { id: 3, time: "1:00 PM", title: "Trattoria da Enzo al 29 (Lunch)", location: "Trastevere, Rome", price: "$27.00", priceLabel: "per person", buttonLabel: "Reserve Table", image: restaurantImg },
  { id: 4, time: "3:00 PM", title: "Colosseum & Roman Forum", location: "Piazza del Colosseo, Rome", price: "$20.00", priceLabel: "per ticket", buttonLabel: "Book Ticket", image: colosseumImg },
];

export default function Index() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeStop, setActiveStop] = useState(1);
  const [viewMode, setViewMode] = useState<"itinerary" | "map">("itinerary");
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [dbRoutes, setDbRoutes] = useState<any[]>([]);
  const { tripPlan, isAiGenerated } = useItinerary();

  // Fetch routes from database when trip is AI-generated
  useEffect(() => {
    if (!isAiGenerated || !tripPlan) return;
    const fetchRoutes = async () => {
      const { data } = await supabase
        .from("trip_routes")
        .select("*")
        .eq("trip_id", tripPlan.tripId || "");
      if (data) setDbRoutes(data);
    };
    fetchRoutes();
  }, [isAiGenerated, tripPlan]);

  // Build route segments from DB data
  const routeSegments: RouteSegment[] = useMemo(() => {
    if (dbRoutes.length === 0) return [];
    const segMap = new Map<string, RouteSegment>();
    for (const r of dbRoutes) {
      const key = `${r.from_location}→${r.to_location}`;
      if (!segMap.has(key)) {
        segMap.set(key, { from: r.from_location, to: r.to_location, modes: [] });
      }
      let polyline: [number, number][] | undefined;
      if (r.route_polyline) {
        try { polyline = JSON.parse(r.route_polyline); } catch {}
      }
      segMap.get(key)!.modes.push({
        transport_mode: r.transport_mode,
        distance_km: r.distance_km || 0,
        duration_minutes: r.duration_minutes || 0,
        polyline,
      });
    }
    return Array.from(segMap.values());
  }, [dbRoutes]);

  // Build travel segments for itinerary cards
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

  // Derive data from AI plan or fallback to demo
  const totalDays = isAiGenerated ? tripPlan!.totalDays : 5;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const dayInfo = useMemo(() => {
    if (!isAiGenerated) return defaultDayInfo;
    const info: Record<number, { date: string; title: string }> = {};
    for (const day of tripPlan!.days) {
      info[day.day] = { date: day.date, title: day.title };
    }
    return info;
  }, [tripPlan, isAiGenerated]);

  const currentItems: ItineraryItem[] = useMemo(() => {
    if (!isAiGenerated) return defaultItems;
    const dayPlan = tripPlan!.days.find((d) => d.day === selectedDay);
    if (!dayPlan) return [];
    return dayPlan.stops.map((stop) => ({
      ...stop,
      image: imageMap[stop.image] || colosseumImg,
    }));
  }, [tripPlan, isAiGenerated, selectedDay]);

  const mapStops = useMemo(() => {
    if (!isAiGenerated) return undefined; // MapPanel uses its own defaults
    const dayPlan = tripPlan!.days.find((d) => d.day === selectedDay);
    if (!dayPlan) return [];
    return dayPlan.stops
      .filter((s) => s.lat && s.lng)
      .map((s) => ({
        id: s.id,
        label: s.title,
        lat: s.lat!,
        lng: s.lng!,
        img: imageMap[s.image] || colosseumImg,
      }));
  }, [tripPlan, isAiGenerated, selectedDay]);

  const headerProps = {
    destination: isAiGenerated ? `${tripPlan!.destination} Getaway — ${tripPlan!.totalDays} Days Trip` : "Rome Getaway — 5 Days Trip",
    description: isAiGenerated
      ? `AI-planned trip to ${tripPlan!.destination}, ${tripPlan!.country}`
      : "A 5-day escape through Rome's timeless landmarks, local cuisine, and hidden gems.",
    country: isAiGenerated ? tripPlan!.country : "Italy",
    countryFlag: isAiGenerated ? tripPlan!.countryFlag : "🇮🇹",
    dateRange: isAiGenerated ? tripPlan!.dateRange : "Oct 12–16",
    travelers: isAiGenerated ? tripPlan!.travelers : "2 Adults",
    avgBudget: isAiGenerated ? tripPlan!.avgBudget : "$1,200.00 Avg.",
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      {/* Mobile tabs */}
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

      {/* Main content */}
      <div className="flex-1 pt-16 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Itinerary */}
        <div
          className={`w-full md:w-[42%] lg:w-[38%] border-r border-border overflow-y-auto scrollbar-hide ${
            viewMode === "map" ? "hidden md:block" : ""
          }`}
          style={{ marginTop: viewMode === "itinerary" ? "2.75rem" : 0 }}
        >
          <TripHeader
            selectedDay={selectedDay}
            onDayChange={(day) => { setSelectedDay(day); setActiveStop(1); }}
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
              {currentItems.map((item, i) => (
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
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Map */}
        <div
          className={`flex-1 ${viewMode === "itinerary" ? "hidden md:block" : ""}`}
          style={{ marginTop: viewMode === "map" ? "2.75rem" : 0 }}
        >
          <MapPanel activeStop={activeStop} customStops={mapStops} dayTitle={dayInfo[selectedDay]?.title} routeSegments={routeSegments.length > 0 ? routeSegments : undefined} selectedMode={transportMode} onModeChange={setTransportMode} />
        </div>
      </div>
    </div>
  );
}
