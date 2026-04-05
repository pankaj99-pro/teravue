# Teravue Scraper Service

This service scrapes publicly accessible pages that allow crawling (per robots.txt).
It supports dynamic pages via Playwright and static pages via fetch + Cheerio.

## Install

```bash
cd scraper
npm install
```

## Run

```bash
npm run start
```

## Environment Variables

```
SCRAPER_PORT=8788
CACHE_TTL_MS=3600000
MIN_INTERVAL_MS=4000

TRAIN_SOURCES=[{"name":"rail-site","url":"https://example.com/trains?from={origin}&to={destination}&date={date}","dynamic":true,"waitSelector":".train-row"}]
FLIGHT_SOURCES=[{"name":"flight-site","url":"https://example.com/flights?from={origin}&to={destination}&date={date}","dynamic":true,"waitSelector":".flight-row"}]
HOTEL_SOURCES=[{"name":"hotel-site","url":"https://example.com/hotels?city={city}&checkin={checkin}&checkout={checkout}","dynamic":false}]
PLACE_SOURCES=[{"name":"places-site","url":"https://example.com/places?city={city}&type={type}","dynamic":false}]
```

## API Endpoints

- `POST /trains` → `{ trains: [{ source, items: [...] }] }`
- `POST /flights` → `{ flights: [{ source, items: [...] }] }`
- `POST /hotels` → `{ hotels: [{ source, items: [...] }] }`
- `POST /places` → `{ places: [{ source, items: [...] }] }`

The Supabase edge function `travel-chat` will call this service when `SCRAPER_BASE_URL` is set.
