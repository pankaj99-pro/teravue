import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRANSPORT_MODES = ["car", "bike", "walk", "train"];

const ROUTE_TOOL = {
  type: "function",
  function: {
    name: "return_multimodal_routes",
    description: "Return optimized travel routes between consecutive locations for all transport modes",
    parameters: {
      type: "object",
      properties: {
        route_segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from_location: { type: "string" },
              to_location: { type: "string" },
              from_coords: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] },
              to_coords: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] },
              modes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    transport_mode: { type: "string", enum: ["car", "bike", "walk", "train"] },
                    distance_km: { type: "number" },
                    duration_minutes: { type: "number" },
                    route_polyline: {
                      type: "array",
                      items: { type: "array", items: { type: "number" } },
                      description: "Array of [lat, lng] coordinate pairs forming the route path",
                    },
                    recommended: { type: "boolean" },
                    reasoning: { type: "string" },
                  },
                  required: ["transport_mode", "distance_km", "duration_minutes"],
                },
              },
            },
            required: ["from_location", "to_location", "modes"],
          },
        },
        default_mode_reasoning: { type: "string" },
      },
      required: ["route_segments"],
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
      return new Response(JSON.stringify({ error: "No itinerary found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ routes: [], message: "Not enough geolocated activities" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build pairs
    const pairs = [];
    for (let i = 0; i < locations.length - 1; i++) {
      pairs.push({ from: locations[i], to: locations[i + 1] });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Calculate travel routes between these consecutive locations for ALL 4 transport modes (car, bike, walk, train).

Location pairs:
${pairs.map((p, i) => `${i + 1}. ${p.from.name} (${p.from.lat}, ${p.from.lng}) → ${p.to.name} (${p.to.lat}, ${p.to.lng})`).join("\n")}

For EACH pair, provide routes for all 4 modes:
- car: realistic driving distance and time
- bike: cycling distance and time
- walk: walking distance and time  
- train: public transit / metro time and distance

TRANSPORT MODE RECOMMENDATION RULES (strict):
- distance < 2 km → recommend walk (free, scenic, healthy)
- distance 2–6 km → recommend bike (cheap, moderate speed)
- distance > 6 km → recommend train/metro (public transport)
- car/taxi → recommend ONLY when no public transport available or late night

Always minimize cost. Walking and biking are free/cheap, so prefer them when distance allows.

For each mode, provide a route_polyline as an array of [lat, lng] coordinate pairs (at least 5-8 waypoints following realistic roads/paths). Mark the recommended mode with recommended: true and include reasoning explaining why this mode minimizes cost while being practical.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a route optimization engine. Calculate realistic multi-modal travel routes with accurate distances, durations, and route coordinates." },
          { role: "user", content: prompt },
        ],
        tools: [ROUTE_TOOL],
        tool_choice: { type: "function", function: { name: "return_multimodal_routes" } },
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
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { route_segments: [] };

    // Clear old routes for this trip
    await supabase.from("trip_routes").delete().eq("trip_id", trip_id);

    // Save all route modes
    const inserts: any[] = [];
    for (const segment of result.route_segments || []) {
      for (const mode of segment.modes || []) {
        inserts.push({
          trip_id,
          from_location: segment.from_location,
          to_location: segment.to_location,
          distance_km: mode.distance_km,
          duration_minutes: mode.duration_minutes,
          transport_mode: mode.transport_mode,
          route_polyline: mode.route_polyline ? JSON.stringify(mode.route_polyline) : null,
          route_geometry: segment.from_coords && segment.to_coords ? {
            from: segment.from_coords,
            to: segment.to_coords,
            recommended: mode.recommended || false,
            reasoning: mode.reasoning || "",
          } : null,
        });
      }
    }

    if (inserts.length > 0) {
      await supabase.from("trip_routes").insert(inserts);
    }

    // Log reasoning
    await supabase.from("agent_logs").insert({
      trip_id,
      step_type: "thinking",
      message: `🗺️ Route optimization complete: ${inserts.length} routes calculated across ${TRANSPORT_MODES.length} modes for ${pairs.length} segments. ${result.default_mode_reasoning || ""}`,
    });

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
