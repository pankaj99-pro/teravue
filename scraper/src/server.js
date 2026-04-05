import http from "http";
import { chromium } from "playwright";
import { getCache, setCache } from "./cache.js";
import { rateLimit } from "./rateLimit.js";
import { isAllowedByRobots } from "./robots.js";
import { extractTableRows, extractJsonRows, normalizeTrains, normalizeFlights, normalizeHotels, normalizePlaces } from "./scrape.js";

const PORT = Number(process.env.SCRAPER_PORT || 8788);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 60 * 60 * 1000);
const MIN_INTERVAL_MS = Number(process.env.MIN_INTERVAL_MS || 4000);

const TRAIN_SOURCES = JSON.parse(process.env.TRAIN_SOURCES || "[]");
const FLIGHT_SOURCES = JSON.parse(process.env.FLIGHT_SOURCES || "[]");
const HOTEL_SOURCES = JSON.parse(process.env.HOTEL_SOURCES || "[]");
const PLACE_SOURCES = JSON.parse(process.env.PLACE_SOURCES || "[]");

let browser;
async function getBrowser() {
  if (!browser) browser = await chromium.launch();
  return browser;
}

function buildUrl(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(params[k] || ""));
}

async function fetchHtml(url, dynamic, waitSelector) {
  if (dynamic) {
    const b = await getBrowser();
    const page = await b.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout: 10000 }).catch(() => {});
    }
    const html = await page.content();
    await page.close();
    return html;
  }
  const resp = await fetch(url, { headers: { "User-Agent": "TeravueBot/1.0" } });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  return resp.text();
}

async function scrapeSources(sources, params, normalizer) {
  const results = [];
  for (const source of sources) {
    const url = buildUrl(source.url, params);
    const cacheKey = `page:${url}`;
    const cached = getCache(cacheKey);
    if (cached) {
      results.push({ source: source.name, items: normalizer(cached, params) });
      continue;
    }
    const allowed = await isAllowedByRobots(url);
    if (!allowed) continue;
    await rateLimit(new URL(url).host, MIN_INTERVAL_MS);
    const html = await fetchHtml(url, !!source.dynamic, source.waitSelector);
    setCache(cacheKey, html, CACHE_TTL_MS);
    const rows = extractTableRows(html).concat(extractJsonRows(html));
    results.push({ source: source.name, items: normalizer(rows, params) });
  }
  return results;
}

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return json(res, 404, { error: "Not found" });
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = await parseBody(req);

    if (url.pathname === "/trains") {
      const { origin, destination, date } = body;
      const data = await scrapeSources(
        TRAIN_SOURCES,
        { origin, destination, date },
        (rows, params) => normalizeTrains(rows, params.origin, params.destination)
      );
      return json(res, 200, { trains: data });
    }

    if (url.pathname === "/flights") {
      const { origin, destination, date } = body;
      const data = await scrapeSources(
        FLIGHT_SOURCES,
        { origin, destination, date },
        (rows, params) => normalizeFlights(rows, params.origin, params.destination)
      );
      return json(res, 200, { flights: data });
    }

    if (url.pathname === "/hotels") {
      const { city, checkin, checkout } = body;
      const data = await scrapeSources(
        HOTEL_SOURCES,
        { city, checkin, checkout },
        (rows, params) => normalizeHotels(rows, params.city)
      );
      return json(res, 200, { hotels: data });
    }

    if (url.pathname === "/places") {
      const { city, type } = body;
      const data = await scrapeSources(
        PLACE_SOURCES,
        { city, type },
        (rows, params) => normalizePlaces(rows, params.city, params.type)
      );
      return json(res, 200, { places: data });
    }

    return json(res, 404, { error: "Unknown endpoint" });
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

server.listen(PORT, () => {
  console.log(`Scraper server listening on ${PORT}`);
});

process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});
