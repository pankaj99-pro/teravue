

# Fix: Train Details Lost After Refresh + Geocoding Validation

## Two Problems

**Problem 1: Train data not persisted correctly**
`saveTripToDatabase` writes raw stops to DB. The normalizer (`normalizeItineraryStop`) runs on the in-memory plan for display but the **save path bypasses it**. So `activity_type` stays as `"transport"` or `"airport"`, and `train_number`/`train_name` stay null if the AI didn't explicitly set them. After refresh, `loadFullTrip` reads these nulls back, and `isTrain` fails.

Additionally, `intermediate_stops` stored as a JSON string (not native array) causes `Array.isArray()` to return false on reload.

**Problem 2: AI-hallucinated lat/lng with no validation**
Coordinates come directly from the AI with no geocoding verification. Wrong, swapped, or imprecise coordinates persist permanently.

---

## Plan

### Step 1: Normalize stops before saving to DB (`tripStorage.ts`)

In `saveTripToDatabase`, run each stop through `normalizeItineraryStop()` before building the insert payload. This ensures:
- `activity_type` is set to `"train"` when the stop matches train patterns
- `train_number` and `train_name` are inferred from titles
- `departure_time` and `arrival_time` are populated

```text
Current:  raw stop → insert to DB
Fixed:    raw stop → normalizeItineraryStop() → insert to DB
```

### Step 2: Coerce `intermediate_stops` on load (`tripStorage.ts`)

In `loadFullTrip`, when reading `intermediate_stops`:
- If it's a string, `JSON.parse()` it
- If already an array, use directly
- Otherwise default to undefined

### Step 3: Add coordinate validation guardrails (`itineraryNormalizer.ts`)

Without adding a paid geocoder (Nominatim is free but rate-limited), add basic sanity checks:
- If `|lat| > 90` or `|lng| > 180`, attempt swap; if still invalid, null them out
- If coordinates are identical for consecutive non-hotel stops, flag/offset slightly
- Add a `validateCoordinates` function that checks lat/lng are within valid ranges

### Step 4: Add Nominatim geocoding fallback (`tripStorage.ts`)

Create a lightweight `geocodeLocation` function using free OpenStreetMap Nominatim API:
- Called during save, only for stops where lat/lng are missing or fail validation
- Uses `location_name + destination_city` as search query
- Rate-limited (1 req/sec per Nominatim policy) with a simple delay
- Results overwrite the AI-provided coordinates before DB insert

This runs server-side during save so it's a one-time cost, not on every load.

### Step 5: Debug logging

Add `console.log` in save path showing what `activity_type` and train fields are being written, and in load path showing what comes back.

---

## Files to Modify

1. **`src/lib/tripStorage.ts`** — Import `normalizeItineraryStop`, normalize before save, coerce `intermediate_stops` on load, add Nominatim geocoding fallback, add debug logs
2. **`src/lib/itineraryNormalizer.ts`** — Add `validateCoordinates` function exported for use in save path

No database changes needed.

