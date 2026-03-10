import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { trip_id, action, parameters } = await req.json();
    if (!trip_id || !action) {
      return new Response(JSON.stringify({ error: "trip_id and action are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    let functionName = "";
    let body: Record<string, unknown> = {};
    let memoryType = "";

    switch (action) {
      case "search_flights":
        functionName = "flight-search";
        body = {
          origin: parameters?.origin || "JFK",
          destination: parameters?.destination || parameters?.city || "FCO",
          date: parameters?.date || parameters?.checkin || new Date().toISOString().split("T")[0],
          return_date: parameters?.return_date || parameters?.checkout,
          passengers: parameters?.guests || 1,
        };
        memoryType = "flights_found";
        break;
      case "search_hotels":
        functionName = "hotel-search";
        body = {
          city: parameters?.city || parameters?.destination || "Rome",
          checkin: parameters?.checkin || parameters?.date || new Date().toISOString().split("T")[0],
          checkout: parameters?.checkout || parameters?.return_date,
          guests: parameters?.guests || 2,
          budget: parameters?.budget,
        };
        memoryType = "hotels_found";
        break;
      case "search_restaurants":
        functionName = "restaurant-search";
        body = {
          location: parameters?.location || parameters?.city || parameters?.destination || "Rome",
          cuisine: parameters?.cuisine,
          budget: parameters?.budget ? `$${parameters.budget}` : undefined,
        };
        memoryType = "restaurants_found";
        break;
      case "search_trains": {
        // Call train-search edge function for multi-city route analysis
        const trainResp = await fetch(`${baseUrl}/functions/v1/train-search`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "multi_city_route_analysis",
            origin: parameters?.origin || parameters?.city || parameters?.destination || "Delhi",
            destinations: parameters?.destinations || [parameters?.destination || parameters?.city || "Mumbai"],
          }),
        });

        if (!trainResp.ok) {
          const errorData = await trainResp.json().catch(() => ({ error: "Train search failed" }));
          return new Response(JSON.stringify(errorData), {
            status: trainResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const trainResults = await trainResp.json();
        const trainKey = `trains_${(parameters?.city || parameters?.destination || "default").toLowerCase().replace(/\s+/g, "_")}`;
        await supabase.from("agent_memory").insert({
          user_id: user.id,
          trip_id,
          memory_type: "trains_found",
          memory_key: trainKey,
          content: trainResults,
        });

        return new Response(JSON.stringify({ memory_type: "trains_found", results: trainResults }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "search_attractions":
        // Use AI to generate attractions (no dedicated function exists)
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

        const attractionTool = {
          type: "function",
          function: {
            name: "return_attractions",
            description: "Return attraction recommendations",
            parameters: {
              type: "object",
              properties: {
                attractions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" },
                      description: { type: "string" },
                      rating: { type: "number" },
                      price_range: { type: "string" },
                      duration_hours: { type: "number" },
                      latitude: { type: "number" },
                      longitude: { type: "number" },
                    },
                    required: ["name", "type", "description"],
                  },
                },
              },
              required: ["attractions"],
            },
          },
        };

        const attractionResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You recommend top attractions and activities for travelers." },
              { role: "user", content: `Top attractions in ${parameters?.city || parameters?.location || "Rome"}. Include museums, landmarks, and experiences.` },
            ],
            tools: [attractionTool],
            tool_choice: { type: "function", function: { name: "return_attractions" } },
          }),
        });

        if (!attractionResp.ok) {
          const s = attractionResp.status;
          if (s === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (s === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI error: ${s}`);
        }

        const attractionData = await attractionResp.json();
        const attrToolCall = attractionData.choices?.[0]?.message?.tool_calls?.[0];
        const attractionResults = attrToolCall ? JSON.parse(attrToolCall.function.arguments) : { attractions: [] };

        // Save to memory with memory_key
        const attractionKey = `attractions_${(parameters?.city || parameters?.location || "default").toLowerCase().replace(/\s+/g, "_")}`;
        await supabase.from("agent_memory").insert({
          user_id: user.id,
          trip_id,
          memory_type: "attractions_found",
          memory_key: attractionKey,
          content: attractionResults,
        });

        return new Response(JSON.stringify({ memory_type: "attractions_found", results: attractionResults }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Call the existing edge function
    const toolResp = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!toolResp.ok) {
      const errorData = await toolResp.json().catch(() => ({ error: "Tool call failed" }));
      return new Response(JSON.stringify(errorData), {
        status: toolResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await toolResp.json();

    // Build memory_key from action + parameters
    const keyParts = [action.replace("search_", "")];
    if (parameters?.city) keyParts.push(parameters.city);
    else if (parameters?.destination) keyParts.push(parameters.destination);
    else if (parameters?.location) keyParts.push(parameters.location);
    const memKey = keyParts.join("_").toLowerCase().replace(/\s+/g, "_");

    // Save to agent_memory with memory_key
    await supabase.from("agent_memory").insert({
      user_id: user.id,
      trip_id,
      memory_type: memoryType,
      memory_key: memKey,
      content: results,
    });

    return new Response(JSON.stringify({ memory_type: memoryType, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-execute-tool error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
