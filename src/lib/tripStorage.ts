import { supabase } from "@/integrations/supabase/client";
import { TripPlan, DayPlan } from "@/contexts/ItineraryContext";
import { normalizeTripPlan, normalizeItineraryStop, validateCoordinates } from "@/lib/itineraryNormalizer";
import { geocoder } from "@/lib/geocoder";

const extractNumber = (value: string | undefined, fallback = 0) => {
  if (!value) return fallback;
  const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractInt = (value: string | undefined, fallback = 0) => {
  if (!value) return fallback;
  const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSqlDate = (value?: string): string | null => {
  if (!value) return null;
  const year = new Date().getFullYear();
  const withYear = new Date(`${value} ${year}`);
  if (!Number.isNaN(withYear.getTime())) return withYear.toISOString().slice(0, 10);
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime()) && direct.getFullYear() >= 2020) return direct.toISOString().slice(0, 10);
  return null;
};

const toTimestamp = (timeValue: string | undefined, dayDate: string | null): string | null => {
  if (!timeValue) return null;
  const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    const base = dayDate ?? new Date().toISOString().slice(0, 10);
    const iso = new Date(`${base}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`);
    if (!Number.isNaN(iso.getTime())) return iso.toISOString();
  }
  const direct = new Date(timeValue);
  if (!Number.isNaN(direct.getTime()) && direct.getFullYear() >= 2020) return direct.toISOString();
  return null;
};

const formatDateLabel = (sqlDate: string | null): string => {
  if (!sqlDate) return "";
  const d = new Date(sqlDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return sqlDate;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
};

/** Rate-limit helper */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Coerce intermediate_stops from DB into a proper array */
function coerceIntermediateStops(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) return raw.length > 0 ? raw : undefined;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* not valid JSON */ }
  }
  return undefined;
}

export async function saveTripToDatabase(plan: TripPlan, userId: string): Promise<string | null> {
  try {
    // Delete existing AI trips for this destination
    const { data: existing } = await supabase
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .eq("destination_city", plan.destination)
      .eq("ai_generated", true);

    if (existing && existing.length > 0) {
      for (const old of existing) {
        await supabase.from("trips").delete().eq("id", old.id);
      }
    }

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        user_id: userId,
        title: `${plan.destination} Getaway — ${plan.totalDays} Days`,
        destination_city: plan.destination,
        destination_country: plan.country,
        estimated_budget: extractNumber(plan.avgBudget, 0),
        travelers_count: extractInt(plan.travelers, 2) || 2,
        ai_generated: true,
      })
      .select()
      .single();

    if (tripError || !trip) {
      console.error("Failed to save trip:", tripError);
      return null;
    }

    let savedDays = 0;
    let savedActivities = 0;
    let geocodedCount = 0;
    let aiAcceptedCount = 0;

    for (const day of plan.days || []) {
      const parsedDayDate = toSqlDate(day.date);

      const { data: tripDay, error: dayError } = await supabase
        .from("trip_days")
        .insert({
          trip_id: trip.id,
          day_number: day.day,
          summary: day.title,
          date: parsedDayDate,
        })
        .select()
        .single();

      if (dayError || !tripDay) {
        console.error("Failed to save trip day:", dayError);
        continue;
      }
      savedDays++;

      for (const rawStop of day.stops || []) {
        // Normalize stop (infers train detection, meal times, etc.)
        const stop = normalizeItineraryStop(rawStop, savedActivities);

        // Validate basic coord bounds
        let coords = validateCoordinates(stop.lat, stop.lng);

        // Geocode: verify AI coords or resolve missing ones
        const geocodeResult = await geocoder.geocodeStop(
          {
            stopTitle: stop.title,
            stopLocation: stop.location || "",
            destinationCity: plan.destination || "",
            country: plan.country || "",
          },
          coords.lat,
          coords.lng,
          stop.image
        );

        if (geocodeResult) {
          if (geocodeResult.source === "ai") {
            coords = { lat: geocodeResult.lat, lng: geocodeResult.lng };
            aiAcceptedCount++;
          } else {
            console.log(
              `[geocode] "${stop.title}" corrected: (${coords.lat},${coords.lng}) → (${geocodeResult.lat},${geocodeResult.lng}) [${geocodeResult.source}, conf=${geocodeResult.confidence.toFixed(2)}]`
            );
            coords = { lat: geocodeResult.lat, lng: geocodeResult.lng };
            geocodedCount++;
          }
          // Rate limit between geocode calls
          await delay(geocodeResult.source === "nominatim" ? 1100 : 250);
        } else if (coords.lat == null || coords.lng == null) {
          console.warn(`[geocode] No coords for "${stop.title}" — geocoding failed, flagging`);
        }

        const insertData: Record<string, unknown> = {
          trip_day_id: tripDay.id,
          title: stop.title,
          location_name: stop.location || "",
          start_time: toTimestamp(stop.time, parsedDayDate),
          price_estimate: stop.price ? extractNumber(stop.price) : null,
          activity_type: stop.image || "activity",
          latitude: coords.lat,
          longitude: coords.lng,
        };

        if (stop.trainNumber) insertData.train_number = stop.trainNumber;
        if (stop.trainName) insertData.train_name = stop.trainName;
        if (stop.intermediateStops?.length) insertData.intermediate_stops = stop.intermediateStops;
        if (stop.departureTime) insertData.departure_time = stop.departureTime;
        if (stop.arrivalTime) insertData.arrival_time = stop.arrivalTime;
        if (stop.platform) insertData.platform = stop.platform;

        console.log(`[save] "${stop.title}" | type=${insertData.activity_type} | train=${stop.trainNumber || "—"} | coords=(${coords.lat},${coords.lng})`);

        const { error: activityError } = await supabase.from("activities").insert(insertData as any);

        if (activityError) {
          console.error("Failed to save activity:", activityError, "stop:", stop.title);
        } else {
          savedActivities++;
        }
      }
    }

    console.log(`Trip saved: ${savedDays} days, ${savedActivities} activities | ${geocodedCount} geocoded, ${aiAcceptedCount} AI-accepted`);
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
    .maybeSingle();

  if (!trip) return null;

  const { data: days } = await supabase
    .from("trip_days")
    .select("*, activities(*)")
    .eq("trip_id", tripId)
    .order("day_number");

  if (!days || days.length === 0) return null;

  const planDays: DayPlan[] = days.map((d: any) => ({
    day: d.day_number,
    date: formatDateLabel(d.date),
    title: d.summary || `Day ${d.day_number}`,
    stops: (d.activities || [])
      .sort((a: any, b: any) => {
        if (!a.start_time || !b.start_time) return 0;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      })
      .map((a: any, i: number) => {
        const intermediateStops = coerceIntermediateStops(a.intermediate_stops);

        console.log(`[load] "${a.title}" | type=${a.activity_type} | train=${a.train_number || "—"} | intermediateStops=${intermediateStops?.length ?? 0}`);

        return {
          id: i + 1,
          time: a.start_time
            ? new Date(a.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
            : (a.departure_time || ""),
          title: a.title,
          location: a.location_name || "",
          price: a.price_estimate ? `$${Number(a.price_estimate).toFixed(2)}` : undefined,
          priceLabel: a.price_estimate ? "estimated" : undefined,
          buttonLabel:
            a.activity_type === "hotel" ? "View Booking"
            : a.activity_type === "restaurant" ? "Reserve Table"
            : a.activity_type === "airport" || a.activity_type === "transport" ? "View Details"
            : a.activity_type === "train" ? "View Train"
            : "Book Ticket",
          image: a.activity_type || "activity",
          lat: a.latitude,
          lng: a.longitude,
          trainNumber: a.train_number || undefined,
          trainName: a.train_name || undefined,
          intermediateStops,
          departureTime: a.departure_time || undefined,
          arrivalTime: a.arrival_time || undefined,
          platform: a.platform || undefined,
        };
      }),
  }));

  const flagMapRaw: Record<string, string> = {
    Italy: "🇮🇹", Japan: "🇯🇵", France: "🇫🇷", Spain: "🇪🇸", Greece: "🇬🇷",
    Thailand: "🇹🇭", Indonesia: "🇮🇩", USA: "🇺🇸", UK: "🇬🇧", Germany: "🇩🇪",
    Portugal: "🇵🇹", Turkey: "🇹🇷", India: "🇮🇳", Australia: "🇦🇺", Mexico: "🇲🇽",
    Brazil: "🇧🇷", Canada: "🇨🇦", China: "🇨🇳", "South Korea": "🇰🇷", Egypt: "🇪🇬",
    Morocco: "🇲🇦", Peru: "🇵🇪", Colombia: "🇨🇴", Argentina: "🇦🇷", Vietnam: "🇻🇳",
    "New Zealand": "🇳🇿", Netherlands: "🇳🇱", Switzerland: "🇨🇭", Sweden: "🇸🇪",
    Norway: "🇳🇴", Ireland: "🇮🇪", Croatia: "🇭🇷", Iceland: "🇮🇸", Singapore: "🇸🇬",
    Malaysia: "🇲🇾", Philippines: "🇵🇭", "Sri Lanka": "🇱🇰", Nepal: "🇳🇵",
    "Czech Republic": "🇨🇿", Austria: "🇦🇹", Belgium: "🇧🇪", Poland: "🇵🇱",
    Hungary: "🇭🇺", Romania: "🇷🇴", Denmark: "🇩🇰", Finland: "🇫🇮",
    "United Arab Emirates": "🇦🇪", "Saudi Arabia": "🇸🇦", Kenya: "🇰🇪",
    Tanzania: "🇹🇿", "South Africa": "🇿🇦", Cuba: "🇨🇺", Jamaica: "🇯🇲",
    "Costa Rica": "🇨🇷", Chile: "🇨🇱", Ecuador: "🇪🇨", Russia: "🇷🇺",
  };
  const flagMap = new Map(Object.entries(flagMapRaw).map(([k, v]) => [k.toLowerCase(), v]));
  const countryKey = (trip.destination_country || "").toLowerCase();
  const countryFlag = flagMap.get(countryKey) || "🌍";

  let dateRange = "";
  if (trip.start_date && trip.end_date) {
    dateRange = `${new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(trip.end_date).toLocaleDateString("en-US", { day: "numeric" })}`;
  } else if (planDays.length > 0) {
    const firstDate = planDays[0].date;
    const lastDate = planDays[planDays.length - 1].date;
    dateRange = firstDate === lastDate ? firstDate : `${firstDate} – ${lastDate}`;
  }

  const rawPlan: TripPlan = {
    tripId: trip.id,
    destination: trip.destination_city || "Unknown",
    country: trip.destination_country || "Unknown",
    countryFlag,
    totalDays: planDays.length,
    dateRange,
    travelers: `${trip.travelers_count || 2} Travelers`,
    avgBudget: `$${(trip.estimated_budget || 0).toLocaleString()} Avg.`,
    days: planDays,
  };

  return normalizeTripPlan(rawPlan);
}

export async function deleteTrip(tripId: string) {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) console.error("Failed to delete trip:", error);
  return !error;
}
