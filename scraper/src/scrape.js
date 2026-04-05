import { load } from "cheerio";

function headerKey(text) {
  const t = text.toLowerCase();
  if (t.includes("train") && t.includes("no")) return "trainNumber";
  if (t.includes("train")) return "trainName";
  if (t.includes("flight")) return "flight";
  if (t.includes("airline")) return "airline";
  if (t.includes("depart")) return "departure";
  if (t.includes("arrival") || t.includes("arrive")) return "arrival";
  if (t.includes("price") || t.includes("fare")) return "price";
  if (t.includes("duration")) return "duration";
  if (t.includes("rating")) return "rating";
  if (t.includes("hotel")) return "hotelName";
  if (t.includes("place") || t.includes("attraction") || t.includes("restaurant")) return "placeName";
  return null;
}

export function extractTableRows(html) {
  const $ = load(html);
  const tables = $("table");
  const rows = [];

  tables.each((_, table) => {
    const headers = [];
    $(table).find("thead th").each((_, th) => {
      headers.push(headerKey($(th).text().trim()));
    });
    if (headers.length === 0) {
      $(table).find("tr").first().find("th,td").each((_, th) => {
        headers.push(headerKey($(th).text().trim()));
      });
    }
    $(table).find("tbody tr").each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length === 0) return;
      const item = {};
      cells.each((i, td) => {
        const key = headers[i];
        if (!key) return;
        const text = $(td).text().replace(/\s+/g, " ").trim();
        if (text) item[key] = text;
      });
      if (Object.keys(item).length > 0) rows.push(item);
    });
  });

  return rows;
}

function deepCollect(obj, predicate, results) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) deepCollect(item, predicate, results);
    return;
  }
  if (predicate(obj)) results.push(obj);
  for (const key of Object.keys(obj)) {
    deepCollect(obj[key], predicate, results);
  }
}

function extractJsonBlocks(html) {
  const $ = load(html);
  const blocks = [];
  const nextData = $("#__NEXT_DATA__").first().text();
  if (nextData) blocks.push(nextData);
  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("__INITIAL_STATE__") || text.includes("preloadedState") || text.includes("window.__data")) {
      blocks.push(text);
    }
  });
  return blocks;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractJsonRows(html) {
  const blocks = extractJsonBlocks(html);
  const rows = [];

  for (const block of blocks) {
    if (block.trim().startsWith("{") || block.trim().startsWith("[")) {
      const parsed = tryParseJson(block.trim());
      if (parsed) {
        deepCollect(
          parsed,
          (o) =>
            typeof o.trainName === "string" ||
            typeof o.train_number === "string" ||
            typeof o.trainNumber === "string" ||
            (typeof o.departureTime === "string" && typeof o.arrivalTime === "string"),
          rows
        );
      }
      continue;
    }

    const match = block.match(/__INITIAL_STATE__\s*=\s*({.*})\s*;/s)
      || block.match(/preloadedState\s*=\s*({.*})\s*;/s);
    if (match?.[1]) {
      const parsed = tryParseJson(match[1]);
      if (parsed) {
        deepCollect(
          parsed,
          (o) =>
            typeof o.trainName === "string" ||
            typeof o.train_number === "string" ||
            typeof o.trainNumber === "string" ||
            (typeof o.departureTime === "string" && typeof o.arrivalTime === "string"),
          rows
        );
      }
    }
  }

  return rows.map((r) => ({
    trainName: r.trainName || r.train_name || r.name || "",
    trainNumber: r.trainNumber || r.train_number || r.number || r.trainNo || "",
    departure: r.departureTime || r.departure || r.dep || "",
    arrival: r.arrivalTime || r.arrival || r.arr || "",
    duration: r.duration || "",
    price: r.price || r.fare || r.amount || "",
  })).filter((r) => r.trainName || r.trainNumber);
}

export function normalizeTrains(rows, origin, destination) {
  return rows.map((r) => ({
    trainName: r.trainName || r.flight || r.airline || "",
    trainNumber: r.trainNumber || "",
    from: origin || r.from || "",
    to: destination || r.to || "",
    departure: r.departure || "",
    arrival: r.arrival || "",
    duration: r.duration || "",
    price: r.price || "",
  })).filter((r) => r.trainName || r.trainNumber);
}

export function normalizeFlights(rows, origin, destination) {
  return rows.map((r) => ({
    airline: r.airline || r.flight || "",
    from: origin || r.from || "",
    to: destination || r.to || "",
    departure: r.departure || "",
    arrival: r.arrival || "",
    duration: r.duration || "",
    price: r.price || "",
  })).filter((r) => r.airline);
}

export function normalizeHotels(rows, city) {
  return rows.map((r) => ({
    name: r.hotelName || r.placeName || "",
    city,
    price: r.price || "",
    rating: r.rating || "",
  })).filter((r) => r.name);
}

export function normalizePlaces(rows, city, type) {
  return rows.map((r) => ({
    name: r.placeName || r.hotelName || "",
    city,
    type,
    rating: r.rating || "",
  })).filter((r) => r.name);
}
