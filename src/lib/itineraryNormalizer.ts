import type { DayPlan, ItineraryStop, TripPlan } from "@/contexts/ItineraryContext";
import { geocoder } from "@/lib/geocoder";

const TRAIN_HINT_REGEX = /\b(train|express|rajdhani|shatabdi|duronto|rail|station|junction|jn|intercity|superfast|mail|vande\s?bharat|garib\s?rath|humsafar|tejas|gatimaan|cantt|railway|platform|terminus)\b/i;
const ROUTE_SPLIT_REGEX = /\s*(?:→|->| to )\s*/i;
const TRAIN_NUMBER_REGEX = /\b\d{4,6}\b/;
const FLIGHT_HINT_REGEX = /\b(flight|air|airline|airport|airways|aviation|boarding|terminal)\b/i;

const COUNTRY_FLAGS: Record<string, string> = {
  india: "🇮🇳",
  italy: "🇮🇹",
  japan: "🇯🇵",
  france: "🇫🇷",
  spain: "🇪🇸",
  greece: "🇬🇷",
  thailand: "🇹🇭",
  indonesia: "🇮🇩",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  uk: "🇬🇧",
  "united kingdom": "🇬🇧",
  germany: "🇩🇪",
  portugal: "🇵🇹",
  turkey: "🇹🇷",
  australia: "🇦🇺",
  mexico: "🇲🇽",
  brazil: "🇧🇷",
  canada: "🇨🇦",
  china: "🇨🇳",
};

const MEAL_WINDOWS: Record<string, { start: number; end: number; fallback: number }> = {
  breakfast: { start: 6 * 60, end: 10 * 60 + 30, fallback: 8 * 60 + 30 },
  brunch: { start: 10 * 60, end: 12 * 60 + 30, fallback: 11 * 60 },
  lunch: { start: 12 * 60, end: 15 * 60, fallback: 13 * 60 + 30 },
  dinner: { start: 18 * 60, end: 22 * 60 + 30, fallback: 20 * 60 },
};

const toMinutes = (time?: string): number | null => {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && h < 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;

  return h * 60 + m;
};

const toTimeLabel = (minutes: number): string => {
  const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${meridiem}`;
};

const extractRoute = (title: string): { from: string; to: string } | null => {
  const cleaned = title.replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(ROUTE_SPLIT_REGEX).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { from: parts[0], to: parts[1] };
  return null;
};

const inferTrainName = (title: string, trainNumber?: string): string => {
  const inBrackets = title.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (inBrackets && !/^train\s*\d+/i.test(inBrackets)) return inBrackets;
  if (trainNumber) return `Train ${trainNumber}`;

  const route = extractRoute(title);
  if (route) return `${route.from} → ${route.to}`;
  return "Rail Journey";
};

const defaultButtonLabel = (image: string) => {
  switch (image) {
    case "hotel":
      return "View Booking";
    case "restaurant":
      return "Reserve Table";
    case "airport":
    case "transport":
      return "View Details";
    case "train":
      return "View Train";
    default:
      return "Book Ticket";
  }
};

const detectMealType = (title: string): keyof typeof MEAL_WINDOWS | null => {
  const t = title.toLowerCase();
  if (/\bbreakfast\b/.test(t)) return "breakfast";
  if (/\bbrunch\b/.test(t)) return "brunch";
  if (/\blunch\b/.test(t)) return "lunch";
  if (/\bdinner\b/.test(t)) return "dinner";
  return null;
};

/** Infer meal type from time-of-day for restaurant stops without explicit keywords */
const inferMealTypeFromTime = (timeMinutes: number): keyof typeof MEAL_WINDOWS | null => {
  if (timeMinutes >= 6 * 60 && timeMinutes <= 10 * 60 + 30) return "breakfast";
  if (timeMinutes >= 12 * 60 && timeMinutes <= 15 * 60) return "lunch";
  if (timeMinutes >= 18 * 60 && timeMinutes <= 22 * 60 + 30) return "dinner";
  // Edge cases: 10:31-11:59 → brunch, 15:01-17:59 → late lunch, 22:31+ → late dinner
  if (timeMinutes >= 10 * 60 + 31 && timeMinutes < 12 * 60) return "brunch";
  if (timeMinutes >= 15 * 60 + 1 && timeMinutes < 18 * 60) return "lunch"; // treat as late lunch
  return null;
};

const normalizeMealTime = (title: string, current?: string, image?: string): string => {
  const mealType = detectMealType(title);
  
  if (mealType) {
    const window = MEAL_WINDOWS[mealType];
    const parsed = toMinutes(current);
    if (parsed == null) return toTimeLabel(window.fallback);
    if (parsed >= window.start && parsed <= window.end) return current || toTimeLabel(parsed);
    return toTimeLabel(window.fallback);
  }

  // For restaurant stops without explicit meal keywords, infer and validate from time
  if (image === "restaurant" && current) {
    const parsed = toMinutes(current);
    if (parsed != null) {
      const inferredMeal = inferMealTypeFromTime(parsed);
      if (inferredMeal) {
        const window = MEAL_WINDOWS[inferredMeal];
        if (parsed >= window.start && parsed <= window.end) return current;
        return toTimeLabel(window.fallback);
      }
    }
  }

  return current || "";
};

export function normalizeItineraryStop(stop: ItineraryStop, index: number): ItineraryStop {
  const title = (stop.title || "").trim() || `Stop ${index + 1}`;
  const location = (stop.location || "").trim() || title;

  const hasRouteArrow = /→|->|\bto\b/i.test(title);
  const hasTrainTimePair = Boolean(stop.departureTime || stop.arrivalTime);

  // Check both title AND location for train hints
  const titleHasTrain = TRAIN_HINT_REGEX.test(title);
  const locationHasTrain = TRAIN_HINT_REGEX.test(location);
  const looksLikeFlight = FLIGHT_HINT_REGEX.test(title) || FLIGHT_HINT_REGEX.test(location);

  const looksTrain =
    stop.image === "train" ||
    Boolean(stop.trainNumber || stop.trainName) ||
    titleHasTrain ||
    locationHasTrain ||
    (hasRouteArrow && hasTrainTimePair && !looksLikeFlight) ||
    (hasRouteArrow && (titleHasTrain || locationHasTrain) && !looksLikeFlight);

  if (looksTrain) {
    console.log(`[normalizer] Detected train stop: "${title}" (location: "${location}")`);
  }

  const image = looksTrain ? "train" : (stop.image || "activity");
  const trainNumber = looksTrain
    ? (stop.trainNumber || title.match(TRAIN_NUMBER_REGEX)?.[0] || location.match(TRAIN_NUMBER_REGEX)?.[0] || undefined)
    : undefined;
  const trainName = looksTrain ? (stop.trainName || inferTrainName(title, trainNumber)) : undefined;
  const departureTime = looksTrain ? (stop.departureTime || stop.time || undefined) : stop.departureTime;
  const arrivalTime = looksTrain ? (stop.arrivalTime || undefined) : undefined;
  const platform = looksTrain ? (stop.platform || undefined) : undefined;
  const intermediateStops = looksTrain ? (stop.intermediateStops || undefined) : undefined;

  const time = looksTrain
    ? (departureTime || stop.time || "")
    : normalizeMealTime(title, stop.time, image);

  return {
    ...stop,
    id: Number.isFinite(stop.id) ? stop.id : index + 1,
    title,
    location,
    image,
    buttonLabel: stop.buttonLabel || defaultButtonLabel(image),
    trainNumber,
    trainName,
    departureTime,
    arrivalTime,
    platform,
    intermediateStops,
    time,
  };
}

/** Post-normalization: ensure chronological ordering within each day */
function enforceChronologicalOrder(stops: ItineraryStop[]): ItineraryStop[] {
  let lastMinutes = 0;
  return stops.map((stop, i) => {
    const parsed = toMinutes(stop.time);
    if (parsed == null) return stop;
    
    if (i > 0 && parsed < lastMinutes) {
      // This stop's time is before the previous stop — push it forward by 30 min
      const corrected = lastMinutes + 30;
      lastMinutes = corrected;
      return { ...stop, time: toTimeLabel(corrected) };
    }
    
    lastMinutes = parsed;
    return stop;
  });
}

export function normalizeTripPlan(plan: TripPlan): TripPlan {
  const normalizedDays: DayPlan[] = (plan.days || []).map((day, dayIndex) => {
    const normalizedStops = (day.stops || []).map((stop, i) => normalizeItineraryStop(stop, i));
    const orderedStops = enforceChronologicalOrder(normalizedStops);
    
    return {
      ...day,
      day: day.day || dayIndex + 1,
      title: day.title || `Day ${day.day || dayIndex + 1}`,
      stops: orderedStops,
    };
  });

  const countryKey = (plan.country || "").trim().toLowerCase();
  const normalizedCountryFlag =
    plan.countryFlag && plan.countryFlag.trim().length > 0
      ? plan.countryFlag
      : COUNTRY_FLAGS[countryKey] || "🌍";

  return {
    ...plan,
    countryFlag: normalizedCountryFlag,
    days: normalizedDays,
  };
}

/** Validate and fix lat/lng. Returns corrected {lat, lng} or nulls. */
export function validateCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): { lat: number | null; lng: number | null } {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null };
  }

  // If lat is out of range but lng is valid, try swapping
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const swapped = { lat: lng, lng: lat };
    if (Math.abs(swapped.lat) <= 90 && Math.abs(swapped.lng) <= 180) {
      console.log(`[coord-fix] Swapped lat/lng: (${lat},${lng}) → (${swapped.lat},${swapped.lng})`);
      return swapped;
    }
  }

  // If still out of range, null them out
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    console.warn(`[coord-fix] Invalid coordinates dropped: (${lat},${lng})`);
    return { lat: null, lng: null };
  }

  return { lat, lng };
}
