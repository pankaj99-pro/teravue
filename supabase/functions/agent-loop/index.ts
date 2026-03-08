import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITERATIONS = 6;

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

    // Create agent run
    const { data: run, error: runError } = await supabase.from("agent_runs").insert({
      user_id: user.id,
      trip_id,
      current_step: "planning",
      status: "running",
      context_json: {},
    }).select().single();

    if (runError) throw new Error(`Failed to create agent run: ${runError.message}`);

    const steps: Array<{ step: number; action: string; reasoning: string; status: string }> = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Step 1: Ask the brain what to do next
      const brainResp = await fetch(`${baseUrl}/functions/v1/agent-brain`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id, current_context: `Iteration ${i + 1} of ${MAX_ITERATIONS}` }),
      });

      if (!brainResp.ok) {
        const err = await brainResp.json().catch(() => ({ error: "Brain call failed" }));
        steps.push({ step: i + 1, action: "error", reasoning: err.error || "Brain failed", status: "error" });
        break;
      }

      const decision = await brainResp.json();
      const { action, reasoning, parameters } = decision;

      // Update run status
      await supabase.from("agent_runs").update({
        current_step: action === "build_itinerary" ? "building_itinerary" : "searching",
        context_json: { iteration: i + 1, last_action: action, reasoning },
      }).eq("id", run.id);

      if (action === "done") {
        steps.push({ step: i + 1, action: "done", reasoning, status: "completed" });
        break;
      }

      if (action === "build_itinerary") {
        // Call itinerary builder
        const itinResp = await fetch(`${baseUrl}/functions/v1/agent-itinerary-builder`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ trip_id }),
        });

        const itinStatus = itinResp.ok ? "success" : "error";
        steps.push({ step: i + 1, action: "build_itinerary", reasoning, status: itinStatus });

        if (itinResp.ok) {
          // Mark complete
          await supabase.from("agent_runs").update({
            current_step: "completed",
            status: "completed",
          }).eq("id", run.id);
          break;
        }
      } else {
        // Execute the tool
        const toolResp = await fetch(`${baseUrl}/functions/v1/agent-execute-tool`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ trip_id, action, parameters }),
        });

        const toolStatus = toolResp.ok ? "success" : "error";
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
      .select("memory_type, content")
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
