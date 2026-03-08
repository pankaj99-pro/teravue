import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DECISION_TOOL = {
  type: "function",
  function: {
    name: "decide_next_action",
    description: "Decide the next action for the travel agent to take",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["search_flights", "search_hotels", "search_restaurants", "search_attractions", "build_itinerary", "done"],
        },
        reasoning: { type: "string" },
        parameters: {
          type: "object",
          description: "Parameters for the chosen action",
          properties: {
            origin: { type: "string" },
            destination: { type: "string" },
            date: { type: "string" },
            return_date: { type: "string" },
            city: { type: "string" },
            checkin: { type: "string" },
            checkout: { type: "string" },
            budget: { type: "number" },
            cuisine: { type: "string" },
            location: { type: "string" },
            guests: { type: "number" },
          },
        },
      },
      required: ["action", "reasoning"],
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

    const { trip_id, current_context } = await req.json();
    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch trip details
    const { data: trip } = await supabase.from("trips").select("*").eq("id", trip_id).single();
    if (!trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing memory for this trip
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("memory_type, content, created_at")
      .eq("trip_id", trip_id)
      .order("created_at");

    const memoryContext = (memories || []).map(m => `[${m.memory_type}]: ${JSON.stringify(m.content)}`).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an autonomous AI travel planning agent. Your job is to decide the NEXT action to take when planning a trip.

Trip details:
- Title: ${trip.title}
- Destination: ${trip.destination_city}, ${trip.destination_country}
- Dates: ${trip.start_date} to ${trip.end_date}
- Budget: $${trip.estimated_budget}
- Travelers: ${trip.travelers_count}

Memory (what we already know):
${memoryContext || "No data collected yet."}

Additional context: ${current_context || "Starting fresh."}

Rules:
1. If no flights found yet, search flights first.
2. If no hotels found, search hotels next.
3. If no restaurants found, search restaurants.
4. If flights, hotels, and restaurants are all found, build the itinerary.
5. If itinerary is already built, return "done".
6. Include relevant parameters for whichever search you choose.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "What should we do next to plan this trip?" },
        ],
        tools: [DECISION_TOOL],
        tool_choice: { type: "function", function: { name: "decide_next_action" } },
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
    const decision = toolCall ? JSON.parse(toolCall.function.arguments) : { action: "done", reasoning: "No decision made" };

    return new Response(JSON.stringify(decision), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-brain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
