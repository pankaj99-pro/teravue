import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROUTE_TOOL = {
  type: "function",
  function: {
    name: "return_routes",
    description: "Return optimized travel routes between locations",
    parameters: {
      type: "object",
      properties: {
        routes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              start_location: { type: "string" },
              end_location: { type: "string" },
              distance_km: { type: "number" },
              travel_time_minutes: { type: "number" },
              transport_mode: { type: "string" },
              route_geometry: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  coordinates: { type: "array", items: { type: "array", items: { type: "number" } } },
                },
              },
            },
            required: ["start_location", "end_location", "distance_km", "travel_time_minutes"],
          },
        },
        total_distance_km: { type: "number" },
        total_travel_time_minutes: { type: "number" },
        optimization_notes: { type: "string" },
      },
      required: ["routes", "total_distance_km", "total_travel_time_minutes"],
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

    // Fetch trip days and activities with coordinates
    const { data: days } = await supabase
      .from("trip_days")
      .select("*, activities(*)")
      .eq("trip_id", trip_id)
      .order("day_number");

    if (!days || days.length === 0) {
      return new Response(JSON.stringify({ error: "No itinerary found for this trip" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build location list from activities
    const locations = days.flatMap((day: any) =>
      (day.activities || [])
        .filter((a: any) => a.latitude && a.longitude)
        .map((a: any) => ({
          name: a.location_name || a.title,
          lat: a.latitude,
          lng: a.longitude,
          day: day.day_number,
        }))
    );

    if (locations.length < 2) {
      return new Response(JSON.stringify({ routes: [], message: "Not enough locations with coordinates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Calculate optimal travel routes between these sequential locations:

${locations.map((l: any, i: number) => `${i + 1}. ${l.name} (${l.lat}, ${l.lng}) - Day ${l.day}`).join("\n")}

For each consecutive pair, determine:
- Distance in km (use realistic road/walking distances)
- Travel time in minutes
- Best transport mode (walk for <1.5km, car/taxi for 1.5-20km, train for >20km)
- Route coordinates as GeoJSON LineString (provide at least start and end point coordinates)

Optimize for minimal total travel time. Suggest reordering if it would save significant time.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a route optimization engine. Calculate realistic travel distances, times, and routes between locations." },
          { role: "user", content: prompt },
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
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { routes: [] };

    // Save routes to trip_routes table
    if (result.routes && result.routes.length > 0) {
      // Clear old routes for this trip
      await supabase.from("trip_routes").delete().eq("trip_id", trip_id);

      const routeInserts = result.routes.map((r: any) => ({
        trip_id,
        start_location: r.start_location,
        end_location: r.end_location,
        distance_km: r.distance_km,
        travel_time_minutes: r.travel_time_minutes,
        route_geometry: r.route_geometry || null,
      }));

      await supabase.from("trip_routes").insert(routeInserts);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-trip-routes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
