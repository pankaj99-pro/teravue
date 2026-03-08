import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADJUSTMENT_TOOL = {
  type: "function",
  function: {
    name: "trip_adjustments",
    description: "Suggest adjustments to a trip based on real-world conditions",
    parameters: {
      type: "object",
      properties: {
        adjustments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["weather_update", "flight_delay", "schedule_change"] },
              original_activity: { type: "string" },
              suggested_change: { type: "string" },
              reason: { type: "string" },
              new_day_number: { type: "number" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["type", "suggested_change", "reason", "priority"],
          },
        },
      },
      required: ["adjustments"],
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

    const { trip_id, trigger_type, trigger_data } = await req.json();
    if (!trip_id) throw new Error("trip_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch current itinerary
    const { data: trip } = await supabase.from("trips").select("*").eq("id", trip_id).single();
    const { data: days } = await supabase.from("trip_days").select("*, activities(*)").eq("trip_id", trip_id).order("day_number");

    if (!trip) throw new Error("Trip not found");

    const prompt = `Analyze this trip and suggest adjustments based on the following trigger:

Trigger type: ${trigger_type || "general_review"}
Trigger data: ${JSON.stringify(trigger_data || {})}

Trip: ${trip.title} in ${trip.destination_city}, ${trip.destination_country}
Dates: ${trip.start_date} to ${trip.end_date}

Current itinerary:
${JSON.stringify(days, null, 2)}

Evaluate the itinerary considering the trigger and suggest practical adjustments. Be specific about what to change and why.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a travel logistics AI. Analyze trips and suggest smart adjustments based on real-world conditions." },
          { role: "user", content: prompt },
        ],
        tools: [ADJUSTMENT_TOOL],
        tool_choice: { type: "function", function: { name: "trip_adjustments" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return adjustments");

    const { adjustments } = JSON.parse(toolCall.function.arguments);

    // Store notifications for each adjustment
    if (adjustments?.length) {
      const notifications = adjustments.map((adj: any) => ({
        user_id: userId,
        trip_id,
        message: `${adj.suggested_change} — ${adj.reason}`,
        type: adj.type || "schedule_change",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return new Response(JSON.stringify({ adjustments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dynamic-trip-adjustment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
