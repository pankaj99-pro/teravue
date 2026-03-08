import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONITOR_TOOL = {
  type: "function",
  function: {
    name: "return_suggestions",
    description: "Return trip adjustment suggestions based on conditions",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["weather", "schedule", "timing", "cost", "safety"] },
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              message: { type: "string" },
              affected_day: { type: "number" },
              recommended_action: { type: "string" },
            },
            required: ["type", "severity", "message", "recommended_action"],
          },
        },
        overall_status: { type: "string", enum: ["good", "needs_attention", "action_required"] },
      },
      required: ["suggestions", "overall_status"],
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

    const { data: days } = await supabase
      .from("trip_days")
      .select("*, activities(*)")
      .eq("trip_id", trip_id)
      .order("day_number");

    const { data: memories } = await supabase
      .from("agent_memory")
      .select("memory_type, content")
      .eq("trip_id", trip_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const now = new Date().toISOString();
    const prompt = `Monitor this trip for potential issues. Current time: ${now}

Trip: ${trip.title}
Destination: ${trip.destination_city}, ${trip.destination_country}
Dates: ${trip.start_date} to ${trip.end_date}
Budget: $${trip.estimated_budget}

Current itinerary:
${JSON.stringify(days, null, 2)}

Agent memory:
${JSON.stringify(memories?.map(m => ({ type: m.memory_type, data: m.content })) || [], null, 2)}

Check for:
1. Weather concerns for the destination and dates (use your knowledge of typical weather patterns)
2. Schedule conflicts or impossible timing between activities
3. Activities scheduled too close together without travel time
4. Budget overruns based on estimated costs
5. Any safety or travel advisory concerns

Provide actionable suggestions.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a trip monitoring agent. Analyze trip details for potential issues and suggest proactive adjustments." },
          { role: "user", content: prompt },
        ],
        tools: [MONITOR_TOOL],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
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
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { suggestions: [], overall_status: "good" };

    // Create notifications for critical suggestions
    if (result.suggestions) {
      for (const suggestion of result.suggestions) {
        if (suggestion.severity === "critical" || suggestion.severity === "warning") {
          await supabase.from("notifications").insert({
            user_id: user.id,
            trip_id,
            type: `trip_monitor_${suggestion.type}`,
            message: `${suggestion.message} — ${suggestion.recommended_action}`,
          });
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trip-monitor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
