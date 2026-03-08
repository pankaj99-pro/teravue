import { supabase } from "@/integrations/supabase/client";
import { TripPlan, DayPlan } from "@/contexts/ItineraryContext";

export async function saveTripToDatabase(plan: TripPlan, userId: string): Promise<string | null> {
  try {
    // Parse dates from dateRange like "Oct 12–16"
    const now = new Date();
    const year = now.getFullYear();

    // Create trip record
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        user_id: userId,
        title: `${plan.destination} Getaway — ${plan.totalDays} Days`,
        destination_city: plan.destination,
        destination_country: plan.country,
        estimated_budget: parseFloat(plan.avgBudget.replace(/[^0-9.]/g, "")) || 0,
        travelers_count: parseInt(plan.travelers.replace(/[^0-9]/g, "")) || 2,
        ai_generated: true,
      })
      .select()
      .single();

    if (tripError || !trip) {
      console.error("Failed to save trip:", tripError);
      return null;
    }

    // Save each day and its activities
    for (const day of plan.days) {
      const { data: tripDay, error: dayError } = await supabase
        .from("trip_days")
        .insert({
          trip_id: trip.id,
          day_number: day.day,
          summary: day.title,
          date: day.date,
        })
        .select()
        .single();

      if (dayError || !tripDay) {
        console.error("Failed to save trip day:", dayError);
        continue;
      }

      // Save activities for this day
      for (const stop of day.stops) {
        await supabase.from("activities").insert({
          trip_day_id: tripDay.id,
          title: stop.title,
          location_name: stop.location,
          start_time: stop.time,
          price_estimate: stop.price ? parseFloat(stop.price.replace(/[^0-9.]/g, "")) : null,
          activity_type: stop.image || "activity",
          latitude: stop.lat || null,
          longitude: stop.lng || null,
        });
      }
    }

    return trip.id;
  } catch (err) {
    console.error("saveTripToDatabase error:", err);
    return null;
  }
}

export async function loadTripsFromDatabase(userId: string) {
  const { data: trips, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load trips:", error);
    return [];
  }
  return trips || [];
}

export async function loadFullTrip(tripId: string): Promise<TripPlan | null> {
  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (!trip) return null;

  const { data: days } = await supabase
    .from("trip_days")
    .select("*, activities(*)")
    .eq("trip_id", tripId)
    .order("day_number");

  if (!days) return null;

  const planDays: DayPlan[] = days.map((d: any) => ({
    day: d.day_number,
    date: d.date || "",
    title: d.summary || `Day ${d.day_number}`,
    stops: (d.activities || []).map((a: any, i: number) => ({
      id: i + 1,
      time: a.start_time || "",
      title: a.title,
      location: a.location_name || "",
      price: a.price_estimate ? `$${a.price_estimate.toFixed(2)}` : undefined,
      priceLabel: a.price_estimate ? "estimated" : undefined,
      buttonLabel: a.activity_type === "hotel" ? "View Booking" : a.activity_type === "restaurant" ? "Reserve Table" : "Book Ticket",
      image: a.activity_type || "activity",
      lat: a.latitude,
      lng: a.longitude,
    })),
  }));

  const flagMap: Record<string, string> = {
    Italy: "🇮🇹", Japan: "🇯🇵", France: "🇫🇷", Spain: "🇪🇸", Greece: "🇬🇷",
    Thailand: "🇹🇭", Indonesia: "🇮🇩", USA: "🇺🇸", UK: "🇬🇧", Germany: "🇩🇪",
    Portugal: "🇵🇹", Turkey: "🇹🇷", India: "🇮🇳", Australia: "🇦🇺", Mexico: "🇲🇽",
  };

  return {
    tripId: trip.id,
    destination: trip.destination_city || "Unknown",
    country: trip.destination_country || "Unknown",
    countryFlag: flagMap[trip.destination_country || ""] || "🌍",
    totalDays: planDays.length,
    dateRange: trip.start_date && trip.end_date
      ? `${new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(trip.end_date).toLocaleDateString("en-US", { day: "numeric" })}`
      : "",
    travelers: `${trip.travelers_count || 2} Travelers`,
    avgBudget: `$${(trip.estimated_budget || 0).toLocaleString()} Avg.`,
    days: planDays,
  };
}

export async function deleteTrip(tripId: string) {
  // Activities cascade from trip_days, trip_days cascade from trips
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) console.error("Failed to delete trip:", error);
  return !error;
}
