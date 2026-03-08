import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_EMOJIS: Record<string, string> = {
  flight_agent: "✈️",
  hotel_agent: "🏨",
  restaurant_agent: "🍝",
  attraction_agent: "📍",
  budget_agent: "💰",
};

const AGENT_LABELS: Record<string, string> = {
  flight_agent: "Flight Agent",
  hotel_agent: "Hotel Agent",
  restaurant_agent: "Restaurant Agent",
  attraction_agent: "Attraction Agent",
  budget_agent: "Budget Agent",
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

    const { task_id, trip_id } = await req.json();
    if (!task_id || !trip_id) {
      return new Response(JSON.stringify({ error: "task_id and trip_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the task
    const { data: task } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (!task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emoji = AGENT_EMOJIS[task.agent_type] || "🤖";
    const label = AGENT_LABELS[task.agent_type] || task.agent_type;
    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    // Mark task as running
    await supabase.from("agent_tasks").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", task_id);

    // Log start
    await supabase.from("agent_logs").insert({
      trip_id,
      agent_run_id: task.agent_run_id,
      step_type: "tool_call",
      message: `${emoji} ${label} — ${task.task_description}`,
    });

    let resultSummary = "";

    // Fetch trip for context
    const { data: trip } = await supabase.from("trips").select("*").eq("id", trip_id).single();

    if (task.agent_type === "budget_agent") {
      // Budget agent: analyze all collected data
      const { data: memories } = await supabase
        .from("agent_memory")
        .select("memory_type, content")
        .eq("trip_id", trip_id);

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const budgetTool = {
        type: "function",
        function: {
          name: "return_budget_analysis",
          description: "Return budget analysis for the trip",
          parameters: {
            type: "object",
            properties: {
              total_estimated_cost: { type: "number" },
              budget_remaining: { type: "number" },
              within_budget: { type: "boolean" },
              breakdown: {
                type: "object",
                properties: {
                  flights: { type: "number" },
                  hotels: { type: "number" },
                  restaurants: { type: "number" },
                  attractions: { type: "number" },
                  transport: { type: "number" },
                  misc: { type: "number" },
                },
              },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    suggestion: { type: "string" },
                    potential_savings: { type: "number" },
                  },
                  required: ["category", "suggestion"],
                },
              },
            },
            required: ["total_estimated_cost", "within_budget", "breakdown"],
          },
        },
      };

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a travel budget analyst. Analyze trip costs and provide budget recommendations." },
            {
              role: "user",
              content: `Analyze the budget for a trip to ${trip?.destination_city}. Total budget: $${trip?.estimated_budget}. Travelers: ${trip?.travelers_count}. Duration: ${trip?.start_date} to ${trip?.end_date}.\n\nCollected data:\n${JSON.stringify(memories?.map((m) => ({ type: m.memory_type, data: m.content })) || [])}`,
            },
          ],
          tools: [budgetTool],
          tool_choice: { type: "function", function: { name: "return_budget_analysis" } },
        }),
      });

      if (!aiResp.ok) {
        const s = aiResp.status;
        if (s === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (s === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${s}`);
      }

      const data = await aiResp.json();
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      const analysis = tc ? JSON.parse(tc.function.arguments) : { total_estimated_cost: 0, within_budget: true, breakdown: {} };

      await supabase.from("agent_memory").insert({
        user_id: user.id,
        trip_id,
        memory_type: "budget_analysis",
        memory_key: `budget_${trip?.destination_city?.toLowerCase().replace(/\s+/g, "_") || "trip"}`,
        content: analysis,
      });

      resultSummary = `Total: $${analysis.total_estimated_cost}. ${analysis.within_budget ? "Within budget ✅" : "Over budget ⚠️"}`;
    } else {
      // Map agent type to tool action
      const actionMap: Record<string, string> = {
        flight_agent: "search_flights",
        hotel_agent: "search_hotels",
        restaurant_agent: "search_restaurants",
        attraction_agent: "search_attractions",
      };

      const action = actionMap[task.agent_type];
      if (!action) throw new Error(`Unknown agent type: ${task.agent_type}`);

      const city = trip?.destination_city || "Rome";
      const country = trip?.destination_country || "Italy";

      const parameters: Record<string, any> = {
        city,
        destination: city,
        location: city,
        date: trip?.start_date,
        checkin: trip?.start_date,
        checkout: trip?.end_date,
        return_date: trip?.end_date,
        guests: trip?.travelers_count || 2,
        budget: trip?.estimated_budget ? Math.round(trip.estimated_budget / ((trip?.travelers_count || 2) * 7)) : undefined,
      };

      // Call agent-execute-tool
      const toolResp = await fetch(`${baseUrl}/functions/v1/agent-execute-tool`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id, action, parameters }),
      });

      if (!toolResp.ok) {
        const errData = await toolResp.json().catch(() => ({ error: "Tool failed" }));
        resultSummary = `Error: ${errData.error || "Failed"}`;
        await supabase.from("agent_tasks").update({ status: "completed", result_summary: resultSummary, updated_at: new Date().toISOString() }).eq("id", task_id);
        await supabase.from("agent_logs").insert({
          trip_id,
          agent_run_id: task.agent_run_id,
          step_type: "tool_result",
          message: `${emoji} ${label} — failed: ${resultSummary}`,
        });
        return new Response(JSON.stringify({ task_id, status: "error", result_summary: resultSummary }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await toolResp.json();
      const count =
        result.results?.flights?.length ||
        result.results?.hotels?.length ||
        result.results?.restaurants?.length ||
        result.results?.attractions?.length || 0;
      resultSummary = `Found ${count} options`;
    }

    // Mark completed
    await supabase.from("agent_tasks").update({
      status: "completed",
      result_summary: resultSummary,
      updated_at: new Date().toISOString(),
    }).eq("id", task_id);

    await supabase.from("agent_logs").insert({
      trip_id,
      agent_run_id: task.agent_run_id,
      step_type: "tool_result",
      message: `${emoji} ${label} — completed: ${resultSummary}`,
    });

    return new Response(JSON.stringify({ task_id, status: "completed", result_summary: resultSummary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-specialized-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
