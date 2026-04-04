

# Fix: Itinerary Quality — Train Details, Meal Timing, Route Optimization

## Problem Summary

The generated itinerary has several critical issues:

1. **Train details missing from itinerary cards** — Stops with `image: "airport"` are used for what should be train segments. The AI returns flights even when user says "via Train." The `isTrain` detection in `Index.tsx` only checks for `image === "train"`, so airport-tagged stops never render as `TrainScheduleCard`.

2. **Backtracking** — The route goes Jabalpur → Delhi → Vrindavan → Agra → Delhi → Jabalpur (Delhi visited twice). Should go Jabalpur → Agra → Vrindavan → Jabalpur (or similar forward-only path).

3. **Meal timing loopholes** — The normalizer only fixes meals with explicit keywords (breakfast/lunch/dinner). Generic "Local restaurant" stops slip through uncorrected.

4. **Day compression** — Day 1 packs a flight + 3-hour drive + hotel + dinner into tight windows with no buffer.

---

## Plan

### Step 1: Harden the system prompt in `travel-chat/index.ts`

- Add an explicit rule: **When user says "via Train", NEVER use flights. All inter-city segments must use `image: "train"` with full train metadata.**
- Add rule: **Transit hubs (like Delhi) must NOT appear as overnight stops unless the user explicitly requests it.** Direct train routes should be preferred.
- Strengthen anti-backtracking: "If city A can be reached directly from origin, do NOT route through city B first."
- Add explicit time-buffer rules: "Day 1 arrival day should have max 3 stops after reaching hotel. Allow 30-min buffer between consecutive stops."
- Add rule for meal detection: "Any restaurant/dining stop must have its time validated against meal windows regardless of title wording."

### Step 2: Fix train detection in `Index.tsx`

Current detection:
```typescript
const isTrain = stop?.image === "train" || !!stop?.trainNumber ||
  (stop?.title && /→|station|junction|express|rajdhani|shatabdi|duronto/i.test(stop.title));
```

Add detection for flight segments that should be trains (when title contains "→" with city names and user selected train mode). Also detect `image: "airport"` stops whose title contains "Flight:" and flag them — but more importantly, the AI should never produce these when user says "via Train."

### Step 3: Enhance `itineraryNormalizer.ts`

- Add meal-time normalization for **any** stop with `image === "restaurant"`, not just those with "breakfast/lunch/dinner" in the title.
- Infer meal type from time-of-day if title doesn't contain a keyword (e.g., a restaurant stop at 1 PM → treat as lunch, validate within 12–3 PM window).
- Add a post-normalization pass that checks chronological ordering within each day and fixes overlapping times.

### Step 4: Add route optimization hint to `create_itinerary` tool description

Update the tool description to include: "BEFORE generating days, compute the geographic shortest path through all destination cities from origin. Visit cities in that order. Never use a transit city (like Delhi) as an overnight stop unless it's a destination itself."

### Step 5: Strengthen `search_trains` tool executor

The current train search executor uses a generic AI prompt. Enhance it to:
- Explicitly request **direct train routes** (no transit cities)
- Request trains sorted by shortest travel time
- Include the instruction: "If no direct train exists, find the route with fewest transfers"

---

## Technical Details

### Files to modify:
1. **`supabase/functions/travel-chat/index.ts`** — System prompt, `search_trains` executor prompt, `create_itinerary` tool description
2. **`src/lib/itineraryNormalizer.ts`** — Time-based meal inference for restaurant stops, chronological ordering pass
3. **`src/pages/Index.tsx`** — Minor: improve train detection fallback

### No database changes needed.

