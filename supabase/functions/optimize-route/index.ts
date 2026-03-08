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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { trip_day_id, coordinates } = await req.json();
    if (!trip_day_id || !coordinates?.length) {
      return new Response(JSON.stringify({ error: "trip_day_id and coordinates are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use AI to generate route optimization (in production, use Mapbox/Google Directions API)
    const ROUTE_TOOL = {
      type: "function",
      function: {
        name: "return_routes",
        description: "Return optimized routes between locations",
        parameters: {
          type: "object",
          properties: {
            routes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from_index: { type: "number" },
                  to_index: { type: "number" },
                  transport_mode: { type: "string", enum: ["car", "walking", "bike", "train", "plane"] },
                  estimated_duration_minutes: { type: "number" },
                  distance_km: { type: "number" },
                },
                required: ["from_index", "to_index", "transport_mode", "estimated_duration_minutes", "distance_km"],
              },
            },
            optimized_order: { type: "array", items: { type: "number" }, description: "Optimal visit order by index" },
          },
          required: ["routes"],
        },
      },
    };

    const coordsText = coordinates.map((c: any, i: number) => `${i}: ${c.name || "Location"} (${c.lat}, ${c.lng})`).join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a route optimization engine. Calculate realistic travel times and distances between locations. Suggest optimal transport modes based on distance." },
          { role: "user", content: `Optimize routes between these locations:\n${coordsText}\n\nReturn routes between consecutive stops with realistic durations and distances.` },
        ],
        tools: [ROUTE_TOOL],
        tool_choice: { type: "function", function: { name: "return_routes" } },
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
    const results = toolCall ? JSON.parse(toolCall.function.arguments) : { routes: [] };

    // Fetch activities for this day to map indices to IDs
    const { data: activities } = await supabase
      .from("activities")
      .select("id")
      .eq("trip_day_id", trip_day_id)
      .order("start_time");

    // Store routes in DB
    if (results.routes?.length && activities?.length) {
      const routeInserts = results.routes
        .filter((r: any) => activities[r.from_index] && activities[r.to_index])
        .map((r: any) => ({
          trip_day_id,
          start_activity_id: activities[r.from_index].id,
          end_activity_id: activities[r.to_index].id,
          transport_mode: r.transport_mode,
          estimated_duration_minutes: r.estimated_duration_minutes,
          distance_km: r.distance_km,
          route_geometry: r.route_geometry || null,
        }));

      if (routeInserts.length) {
        await supabase.from("routes").insert(routeInserts);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
