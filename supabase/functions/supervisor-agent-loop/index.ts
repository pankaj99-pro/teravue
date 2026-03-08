import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agents that must complete before budget analysis
const SEARCH_AGENTS = ["flight_agent", "hotel_agent", "restaurant_agent", "attraction_agent"];
const POST_ITINERARY_AGENTS = ["transport_agent"];

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

    const writeLog = async (runId: string | null, stepType: string, message: string) => {
      await supabase.from("agent_logs").insert({
        trip_id,
        agent_run_id: runId,
        step_type: stepType,
        message,
      });
    };

    // Create a new agent run
    const { data: run, error: runError } = await supabase.from("agent_runs").insert({
      user_id: user.id,
      trip_id,
      current_step: "planning",
      status: "running",
      context_json: { mode: "multi_agent" },
    }).select().single();

    if (runError) throw new Error(`Failed to create run: ${runError.message}`);

    await writeLog(run.id, "thinking", "🧠 Supervisor Agent — Analyzing trip requirements");

    // Step 1: Create tasks for all specialized agents
    const createResp = await fetch(`${baseUrl}/functions/v1/create-agent-tasks`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ trip_id, agent_run_id: run.id }),
    });

    if (!createResp.ok) {
      const err = await createResp.json().catch(() => ({ error: "Failed to create tasks" }));
      throw new Error(err.error || "Failed to create tasks");
    }

    const { tasks } = await createResp.json();
    await writeLog(run.id, "thinking", `🧠 Supervisor — Assigned ${tasks.length} specialized agents`);

    // Update run
    await supabase.from("agent_runs").update({
      current_step: "searching",
      context_json: { mode: "multi_agent", total_tasks: tasks.length },
    }).eq("id", run.id);

    // Step 2: Run search agents (flight, hotel, restaurant, attraction) sequentially
    // Budget agent runs after all search agents complete
    const searchTasks = tasks.filter((t: any) => SEARCH_AGENTS.includes(t.agent_type));
    const budgetTasks = tasks.filter((t: any) => t.agent_type === "budget_agent");

    for (const task of searchTasks) {
      await writeLog(run.id, "thinking", `🧠 Supervisor — Dispatching ${task.agent_type.replace("_", " ")}`);

      const agentResp = await fetch(`${baseUrl}/functions/v1/run-specialized-agent`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, trip_id }),
      });

      if (!agentResp.ok) {
        await writeLog(run.id, "tool_result", `⚠️ ${task.agent_type} failed`);
      }
    }

    await writeLog(run.id, "thinking", "🧠 Supervisor — All search agents completed. Running budget analysis.");

    // Step 3: Run budget agent
    for (const task of budgetTasks) {
      await fetch(`${baseUrl}/functions/v1/run-specialized-agent`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, trip_id }),
      });
    }

    await writeLog(run.id, "thinking", "🧠 Supervisor — Budget analysis complete. Building itinerary.");

    // Step 4: Build itinerary
    await supabase.from("agent_runs").update({
      current_step: "building_itinerary",
    }).eq("id", run.id);

    const itinResp = await fetch(`${baseUrl}/functions/v1/agent-itinerary-builder`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ trip_id }),
    });

    let itineraryResult = null;
    if (itinResp.ok) {
      itineraryResult = await itinResp.json();

      // Save version
      const { data: lastVer } = await supabase
        .from("itinerary_versions")
        .select("version_number")
        .eq("trip_id", trip_id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      const nextVer = (lastVer?.version_number || 0) + 1;
      await supabase.from("itinerary_versions").insert({
        trip_id,
        version_number: nextVer,
        itinerary_data: itineraryResult,
      });

      await writeLog(run.id, "itinerary_build", `📋 Itinerary v${nextVer} built successfully`);
    } else {
      await writeLog(run.id, "itinerary_build", "⚠️ Itinerary build failed");
    }

    // Step 5: Run transport agent (optimizes routes for all modes)
    const transportTasks = tasks.filter((t: any) => POST_ITINERARY_AGENTS.includes(t.agent_type));
    for (const task of transportTasks) {
      await writeLog(run.id, "thinking", `🧠 Supervisor — Dispatching ${task.agent_type.replace("_", " ")}`);
      await fetch(`${baseUrl}/functions/v1/run-specialized-agent`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, trip_id }),
      });
    }
    await writeLog(run.id, "thinking", "🧠 Supervisor — Route optimization complete across all transport modes");

    // Final
    await supabase.from("agent_runs").update({
      current_step: "completed",
      status: "completed",
      context_json: {
        mode: "multi_agent",
        total_tasks: tasks.length,
        completed: true,
      },
    }).eq("id", run.id);

    await writeLog(run.id, "thinking", "✅ Supervisor — All agents finished. Trip planning complete!");

    // Collect final state
    const { data: finalTasks } = await supabase
      .from("agent_tasks")
      .select("agent_type, status, result_summary")
      .eq("trip_id", trip_id)
      .eq("agent_run_id", run.id);

    const { data: finalMemory } = await supabase
      .from("agent_memory")
      .select("memory_type, memory_key")
      .eq("trip_id", trip_id);

    return new Response(JSON.stringify({
      run_id: run.id,
      status: "completed",
      tasks: finalTasks || [],
      memory_collected: finalMemory?.map((m) => m.memory_type) || [],
      itinerary: itineraryResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("supervisor-agent-loop error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
