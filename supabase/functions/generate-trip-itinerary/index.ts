import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ITINERARY_TOOL = {
  type: "function",
  function: {
    name: "create_trip_itinerary",
    description: "Generate a structured multi-day travel itinerary with segment-based travel modes. Each activity represents a segment with travel mode info.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Trip title" },
        destination_city: { type: "string" },
        destination_country: { type: "string" },
        estimated_budget: { type: "number" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day_number: { type: "number" },
              date: { type: "string", description: "ISO date string" },
              summary: { type: "string" },
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    location_name: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    activity_type: {
                      type: "string",
                      enum: ["flight", "train", "hotel", "restaurant", "attraction", "transport"],
                      description: "Type of activity. Use 'train' for rail travel segments, 'flight' for air travel segments, 'transport' for road-based taxi/bike/walk segments.",
                    },
                    start_time: { type: "string" },
                    end_time: { type: "string" },
                    price_estimate: { type: "number" },
                    booking_url: { type: "string" },
                    image_url: { type: "string" },
                    train_number: { type: "string", description: "Train number if activity_type is train" },
                    train_name: { type: "string", description: "Train name if activity_type is train" },
                    departure_time: { type: "string", description: "Departure time for train/flight" },
                    arrival_time: { type: "string", description: "Arrival time for train/flight" },
                    platform: { type: "string", description: "Platform number for train" },
                    intermediate_stops: {
                      type: "array",
                      items: { type: "string" },
                      description: "Intermediate station stops for train journeys",
                    },
                  },
                  required: ["title", "location_name", "activity_type"],
                },
              },
            },
            required: ["day_number", "summary", "activities"],
          },
        },
      },
      required: ["title", "destination_city", "destination_country", "days"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { destination, trip_length_days, budget, travelers, interests, start_date, travel_mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const travelModeInstruction = travel_mode
      ? `Preferred long-distance travel mode: ${travel_mode}. Use this for inter-city segments.`
      : "Choose the most appropriate travel mode based on distance: flight for international/very long distances, train for domestic inter-city, taxi/walk for local.";

    const prompt = `Plan a ${trip_length_days}-day trip to ${destination} for ${travelers || 1} traveler(s).
Budget: $${budget || "flexible"}.
Interests: ${(interests || ["general"]).join(", ")}.
Start date: ${start_date || "upcoming"}.
${travelModeInstruction}

CRITICAL RULES FOR SEGMENT-BASED TRAVEL:
1. Every movement between locations must be a separate activity with the correct activity_type.
2. Trip flow must be segment-based:
   - Segment from home/hotel to station/airport: activity_type = "transport"
   - Inter-city rail segment: activity_type = "train" (include train_number, train_name, departure_time, arrival_time, platform, intermediate_stops)
   - Inter-city air segment: activity_type = "flight" (include departure_time, arrival_time)
   - Local travel between attractions: activity_type = "transport"
   - Sightseeing: activity_type = "attraction"
   - Meals: activity_type = "restaurant"
   - Accommodation: activity_type = "hotel"

3. SEQUENCING RULES (VERY IMPORTANT):
   - Start from the user's source city
   - Visit ALL tourist places in the current city before moving to the next city
   - Never backtrack to a previously visited city
   - Each day should start where the previous day ended
   - Return journey should be the last segments of the trip
   - For domestic travel: detect nearest railway station or airport from the user's city
   - For international travel: always use flight for cross-country segments

4. Include latitude and longitude for EVERY activity so the map can render correctly.

Generate a complete day-by-day itinerary with realistic locations, times, and prices.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You are a world-class travel planner. Generate detailed, realistic itineraries using the provided tool.

KEY PRINCIPLES:
- Every trip is a sequence of segments: home → station/airport → destination station/airport → local attractions → next city → ... → return home
- Train and flight segments are FIXED modes and must include full transport details
- Local travel between attractions uses taxi/bike/walk (activity_type: "transport")
- Complete ALL sightseeing in one city before moving to the next
- Never revisit a city once you've left it
- Each activity MUST have accurate latitude and longitude coordinates
- Start each day where the previous day ended`,
          },
          { role: "user", content: prompt },
        ],
        tools: [ITINERARY_TOOL],
        tool_choice: { type: "function", function: { name: "create_trip_itinerary" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured itinerary");

    const itinerary = JSON.parse(toolCall.function.arguments);

    // Store trip
    const { data: trip, error: tripError } = await supabase.from("trips").insert({
      user_id: userId,
      title: itinerary.title,
      destination_city: itinerary.destination_city,
      destination_country: itinerary.destination_country,
      start_date: start_date || null,
      end_date: start_date ? new Date(new Date(start_date).getTime() + (trip_length_days - 1) * 86400000).toISOString().split("T")[0] : null,
      travelers_count: travelers || 1,
      estimated_budget: itinerary.estimated_budget || budget || null,
      ai_generated: true,
    }).select().single();

    if (tripError) throw new Error(`Failed to save trip: ${tripError.message}`);

    // Store days and activities
    for (const day of itinerary.days) {
      const { data: tripDay, error: dayError } = await supabase.from("trip_days").insert({
        trip_id: trip.id,
        day_number: day.day_number,
        date: day.date || null,
        summary: day.summary,
      }).select().single();

      if (dayError) {
        console.error("Failed to save day:", dayError);
        continue;
      }

      if (day.activities?.length) {
        const activitiesData = day.activities.map((a: any) => ({
          trip_day_id: tripDay.id,
          title: a.title,
          location_name: a.location_name,
          latitude: a.latitude || null,
          longitude: a.longitude || null,
          activity_type: a.activity_type,
          start_time: a.start_time || null,
          end_time: a.end_time || null,
          price_estimate: a.price_estimate || null,
          booking_url: a.booking_url || null,
          image_url: a.image_url || null,
          train_number: a.train_number || null,
          train_name: a.train_name || null,
          departure_time: a.departure_time || null,
          arrival_time: a.arrival_time || null,
          platform: a.platform || null,
          intermediate_stops: a.intermediate_stops || null,
        }));

        const { error: actError } = await supabase.from("activities").insert(activitiesData);
        if (actError) console.error("Failed to save activities:", actError);
      }
    }

    return new Response(JSON.stringify({ trip_id: trip.id, itinerary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trip-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
