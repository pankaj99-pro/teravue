import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITERATIONS = 6;

const LOG_MESSAGES: Record<string, { start: string; done: string }> = {
  search_flights: { start: "Searching flights to destination", done: "Flight options found" },
  search_hotels: { start: "Searching hotels near city center", done: "Hotel options found" },
  search_restaurants: { start: "Searching restaurants in the area", done: "Restaurant options found" },
  search_attractions: { start: "Searching top attractions", done: "Attraction options found" },
  build_itinerary: { start: "Building final optimized itinerary", done: "Itinerary built successfully" },
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

    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    // Helper to write agent logs
    const writeLog = async (runId: string, stepType: string, message: string) => {
      await supabase.from("agent_logs").insert({
        trip_id,
        agent_run_id: runId,
        step_type: stepType,
        message,
      });
    };

    // Create agent run
    const { data: run, error: runError } = await supabase.from("agent_runs").insert({
      user_id: user.id,
      trip_id,
      current_step: "planning",
      status: "running",
      context_json: {},
    }).select().single();

    if (runError) throw new Error(`Failed to create agent run: ${runError.message}`);

    await writeLog(run.id, "thinking", "Analyzing trip requirements and gathering context");

    const steps: Array<{ step: number; action: string; reasoning: string; status: string }> = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      await writeLog(run.id, "thinking", `Deciding next action (step ${i + 1}/${MAX_ITERATIONS})`);

      // Step 1: Ask the brain what to do next
      const brainResp = await fetch(`${baseUrl}/functions/v1/agent-brain`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id, current_context: `Iteration ${i + 1} of ${MAX_ITERATIONS}` }),
      });

      if (!brainResp.ok) {
        const err = await brainResp.json().catch(() => ({ error: "Brain call failed" }));
        await writeLog(run.id, "thinking", `Error: ${err.error || "Brain call failed"}`);
        steps.push({ step: i + 1, action: "error", reasoning: err.error || "Brain failed", status: "error" });
        break;
      }

      const decision = await brainResp.json();
      const { action, reasoning, parameters } = decision;

      await writeLog(run.id, "thinking", `Decision: ${action} — ${reasoning}`);

      // Update run status
      await supabase.from("agent_runs").update({
        current_step: action === "build_itinerary" ? "building_itinerary" : "searching",
        context_json: { iteration: i + 1, last_action: action, reasoning },
      }).eq("id", run.id);

      if (action === "done") {
        await writeLog(run.id, "thinking", "All tasks completed — agent finished");
        steps.push({ step: i + 1, action: "done", reasoning, status: "completed" });
        break;
      }

      const logMsg = LOG_MESSAGES[action] || { start: `Executing ${action}`, done: `${action} completed` };

      if (action === "build_itinerary") {
        await writeLog(run.id, "itinerary_build", logMsg.start);

        const itinResp = await fetch(`${baseUrl}/functions/v1/agent-itinerary-builder`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ trip_id }),
        });

        const itinStatus = itinResp.ok ? "success" : "error";
        await writeLog(run.id, "itinerary_build", itinResp.ok ? logMsg.done : "Failed to build itinerary");
        steps.push({ step: i + 1, action: "build_itinerary", reasoning, status: itinStatus });

        if (itinResp.ok) {
          // Save as version 1
          const itinData = await itinResp.json();
          await supabase.from("itinerary_versions").insert({
            trip_id,
            version_number: 1,
            itinerary_data: itinData,
          });

          await supabase.from("agent_runs").update({
            current_step: "completed",
            status: "completed",
          }).eq("id", run.id);
          await writeLog(run.id, "thinking", "Trip planning complete!");
          break;
        }
      } else {
        await writeLog(run.id, "tool_call", logMsg.start);

        const toolResp = await fetch(`${baseUrl}/functions/v1/agent-execute-tool`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ trip_id, action, parameters }),
        });

        const toolStatus = toolResp.ok ? "success" : "error";

        if (toolResp.ok) {
          const toolData = await toolResp.json();
          const resultCount = Array.isArray(toolData?.results?.flights) ? toolData.results.flights.length
            : Array.isArray(toolData?.results?.hotels) ? toolData.results.hotels.length
            : Array.isArray(toolData?.results?.restaurants) ? toolData.results.restaurants.length
            : Array.isArray(toolData?.results?.attractions) ? toolData.results.attractions.length
            : 0;
          await writeLog(run.id, "tool_result", `${logMsg.done} — ${resultCount} options collected`);
        } else {
          await writeLog(run.id, "tool_result", `Failed: ${action}`);
        }

        steps.push({ step: i + 1, action, reasoning, status: toolStatus });
      }
    }

    // Final update
    await supabase.from("agent_runs").update({
      status: "completed",
      current_step: "completed",
      context_json: { steps },
    }).eq("id", run.id);

    // Fetch final memory
    const { data: finalMemory } = await supabase
      .from("agent_memory")
      .select("memory_type, content, memory_key")
      .eq("trip_id", trip_id);

    return new Response(JSON.stringify({
      run_id: run.id,
      steps,
      memory: finalMemory || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-loop error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
