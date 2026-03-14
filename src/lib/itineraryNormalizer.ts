import type { DayPlan, ItineraryStop, TripPlan } from "@/contexts/ItineraryContext";

const TRAIN_HINT_REGEX = /\b(train|express|rajdhani|shatabdi|duronto|rail|station|junction|jn)\b/i;
const ROUTE_SPLIT_REGEX = /\s*(?:→|->| to )\s*/i;
const TRAIN_NUMBER_REGEX = /\b\d{4,6}\b/;

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

const normalizeMealTime = (title: string, current?: string): string => {
  const mealType = detectMealType(title);
  if (!mealType) return current || "";

  const window = MEAL_WINDOWS[mealType];
  const parsed = toMinutes(current);
  if (parsed == null) return toTimeLabel(window.fallback);
  if (parsed >= window.start && parsed <= window.end) return current || toTimeLabel(parsed);
  return toTimeLabel(window.fallback);
};

export function normalizeItineraryStop(stop: ItineraryStop, index: number): ItineraryStop {
  const title = (stop.title || "").trim() || `Stop ${index + 1}`;
  const location = (stop.location || "").trim() || title;

  const looksTrain =
    stop.image === "train" ||
    Boolean(stop.trainNumber || stop.trainName) ||
    TRAIN_HINT_REGEX.test(title);

  const image = looksTrain ? "train" : (stop.image || "activity");
  const trainNumber = looksTrain ? (stop.trainNumber || title.match(TRAIN_NUMBER_REGEX)?.[0] || undefined) : undefined;
  const trainName = looksTrain ? (stop.trainName || inferTrainName(title, trainNumber)) : undefined;
  const departureTime = looksTrain ? (stop.departureTime || stop.time || undefined) : stop.departureTime;

  const time = looksTrain
    ? (departureTime || stop.time || "")
    : normalizeMealTime(title, stop.time);

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
    time,
  };
}

export function normalizeTripPlan(plan: TripPlan): TripPlan {
  const normalizedDays: DayPlan[] = (plan.days || []).map((day, dayIndex) => ({
    ...day,
    day: day.day || dayIndex + 1,
    title: day.title || `Day ${day.day || dayIndex + 1}`,
    stops: (day.stops || []).map((stop, i) => normalizeItineraryStop(stop, i)),
  }));

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
