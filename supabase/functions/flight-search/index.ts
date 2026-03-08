import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { origin, destination, date, return_date, passengers } = await req.json();
    if (!origin || !destination || !date) {
      return new Response(JSON.stringify({ error: "origin, destination, and date are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to generate realistic flight search results
    // In production, replace with Amadeus, Skyscanner, or Duffel API
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const FLIGHT_TOOL = {
      type: "function",
      function: {
        name: "return_flights",
        description: "Return flight search results",
        parameters: {
          type: "object",
          properties: {
            flights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  airline: { type: "string" },
                  flight_number: { type: "string" },
                  departure_time: { type: "string" },
                  arrival_time: { type: "string" },
                  duration: { type: "string" },
                  price: { type: "number" },
                  currency: { type: "string" },
                  stops: { type: "number" },
                  booking_url: { type: "string" },
                },
                required: ["airline", "flight_number", "departure_time", "arrival_time", "duration", "price"],
              },
            },
          },
          required: ["flights"],
        },
      },
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate realistic flight search results based on real airlines and routes. Include realistic prices, times, and flight numbers." },
          { role: "user", content: `Search flights from ${origin} to ${destination} on ${date}. Passengers: ${passengers || 1}. ${return_date ? `Return: ${return_date}` : "One way."}` },
        ],
        tools: [FLIGHT_TOOL],
        tool_choice: { type: "function", function: { name: "return_flights" } },
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
    const results = toolCall ? JSON.parse(toolCall.function.arguments) : { flights: [] };

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("flight-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
