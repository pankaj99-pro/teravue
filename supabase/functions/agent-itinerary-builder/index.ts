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
    name: "return_itinerary",
    description: "Return a structured multi-day travel itinerary",
    parameters: {
      type: "object",
      properties: {
        itinerary: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day_number: { type: "number" },
              date: { type: "string" },
              summary: { type: "string" },
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    start_time: { type: "string" },
                    end_time: { type: "string" },
                    activity_type: { type: "string", enum: ["flight", "hotel", "restaurant", "attraction", "transport", "train", "free_time"] },
                    location_name: { type: "string" },
                    price_estimate: { type: "number" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    train_number: { type: "string", description: "Train number if activity_type is train" },
                    train_name: { type: "string", description: "Train name if activity_type is train" },
                    intermediate_stops: { type: "array", items: { type: "string" }, description: "Key intermediate stops for train journeys" },
                  },
                  required: ["title", "activity_type"],
                },
              },
            },
            required: ["day_number", "summary", "activities"],
          },
        },
        total_estimated_cost: { type: "number" },
        tips: { type: "array", items: { type: "string" } },
      },
      required: ["itinerary"],
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { trip_id } = await req.json();
    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: trip } = await supabase.from("trips").select("*").eq("id", trip_id).single();
    if (!trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all memory
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("memory_type, content")
      .eq("trip_id", trip_id);

    const memoryMap: Record<string, unknown> = {};
    for (const m of memories || []) {
      memoryMap[m.memory_type] = m.content;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Build an optimized multi-day travel itinerary using the following data:

Trip: ${trip.title}
Destination: ${trip.destination_city}, ${trip.destination_country}
Dates: ${trip.start_date} to ${trip.end_date}
Budget: $${trip.estimated_budget}
Travelers: ${trip.travelers_count}

Available data:
- Flights: ${JSON.stringify(memoryMap["flights_found"] || "Not available")}
- Hotels: ${JSON.stringify(memoryMap["hotels_found"] || "Not available")}
- Restaurants: ${JSON.stringify(memoryMap["restaurants_found"] || "Not available")}
- Attractions: ${JSON.stringify(memoryMap["attractions_found"] || "Not available")}
- Route data: ${JSON.stringify(memoryMap["routes_optimized"] || "Not available")}

Create a day-by-day itinerary that:
1. Starts with arrival flight and ends with departure
2. Includes hotel check-in/out
3. **CRITICAL: Optimizes visit order using nearest-neighbor algorithm** — for each day, visit the closest unvisited attraction next to minimize backtracking
4. **CRITICAL: Each day starts from the previous day's last location** — Day 2 begins near where Day 1 ended, avoiding cross-city morning travel
5. **Transport mode selection by distance:**
   - < 2 km → Walking (free)
   - 2–6 km → Bike (cheap)
   - > 6 km → Public transport (metro/train)
   - Car/taxi only when necessary (late night, heavy luggage)
6. Clusters geographically close attractions on the same day
7. Balances busy days with rest
8. Includes meal recommendations at found restaurants (placed near that day's attractions)
9. Stays within budget — minimize transport costs by preferring walking/biking
10. Include travel time and transport mode between consecutive stops in the activity descriptions`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a travel itinerary optimizer. Build detailed, realistic, time-aware itineraries." },
          { role: "user", content: prompt },
        ],
        tools: [ITINERARY_TOOL],
        tool_choice: { type: "function", function: { name: "return_itinerary" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await aiResponse.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const itinerary = toolCall ? JSON.parse(toolCall.function.arguments) : { itinerary: [] };

    // Save itinerary draft to memory
    await supabase.from("agent_memory").insert({
      user_id: user.id,
      trip_id,
      memory_type: "itinerary_draft",
      content: itinerary,
    });

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-itinerary-builder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
