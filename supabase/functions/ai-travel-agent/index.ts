import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "suggest_itinerary_change",
      description: "Suggest a change to the trip itinerary",
      parameters: {
        type: "object",
        properties: {
          trip_id: { type: "string" },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["add", "remove", "move", "replace"] },
                day_number: { type: "number" },
                activity_title: { type: "string" },
                reason: { type: "string" },
                replacement: { type: "string" },
              },
              required: ["action", "reason"],
            },
          },
        },
        required: ["changes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_places",
      description: "Recommend attractions, restaurants, or activities",
      parameters: {
        type: "object",
        properties: {
          places: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["attraction", "restaurant", "hotel", "activity"] },
                description: { type: "string" },
                price_range: { type: "string" },
                rating: { type: "number" },
                latitude: { type: "number" },
                longitude: { type: "number" },
              },
              required: ["name", "type", "description"],
            },
          },
        },
        required: ["places"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are TERAVUE AI — an autonomous travel concierge agent. You have deep knowledge of global destinations, cuisines, cultures, and logistics.

Your capabilities:
- Generate and refine travel itineraries
- Suggest attractions, restaurants, and experiences
- Recommend optimal routes and transport
- Plan train-based multi-city travel with route optimization
- Analyze train routes and intermediate stops to minimize backtracking
- Monitor and adapt to travel disruptions
- Provide local tips and cultural insights

For Indian travel, you can search trains between stations, analyze train routes for intermediate stops, and determine the most efficient city visiting order. When planning multi-city trips, prefer train routes where multiple destinations appear along the same line.

Always be specific with locations, realistic with prices, and thoughtful with time management. Use the provided tools when the user requests actionable changes or recommendations.`;

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

    const { messages, trip_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // If trip_id provided, fetch trip context
    let tripContext = "";
    if (trip_id) {
      const { data: trip } = await supabase.from("trips").select("*").eq("id", trip_id).single();
      const { data: days } = await supabase.from("trip_days").select("*, activities(*)").eq("trip_id", trip_id).order("day_number");
      if (trip) {
        tripContext = `\n\nCurrent trip context:\nTitle: ${trip.title}\nDestination: ${trip.destination_city}, ${trip.destination_country}\nDates: ${trip.start_date} to ${trip.end_date}\nBudget: $${trip.estimated_budget}\n\nItinerary:\n${JSON.stringify(days, null, 2)}`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + tripContext },
          ...messages,
        ],
        tools: AGENT_TOOLS,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-travel-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
