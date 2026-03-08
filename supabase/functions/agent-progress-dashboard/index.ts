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

    const { trip_id } = await req.json();
    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all tasks for this trip
    const { data: tasks } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("trip_id", trip_id)
      .order("created_at");

    // Fetch latest run
    const { data: runs } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestRun = runs?.[0] || null;

    // Fetch memory
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("memory_type, memory_key")
      .eq("trip_id", trip_id);

    // Fetch latest version
    const { data: latestVersion } = await supabase
      .from("itinerary_versions")
      .select("version_number")
      .eq("trip_id", trip_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    // Fetch recent logs
    const { data: recentLogs } = await supabase
      .from("agent_logs")
      .select("step_type, message, created_at")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Build per-agent status
    const agentTypes = ["flight_agent", "hotel_agent", "restaurant_agent", "attraction_agent", "budget_agent"];
    const agentLabels: Record<string, { emoji: string; label: string }> = {
      flight_agent: { emoji: "✈️", label: "Flight Agent" },
      hotel_agent: { emoji: "🏨", label: "Hotel Agent" },
      restaurant_agent: { emoji: "🍝", label: "Restaurant Agent" },
      attraction_agent: { emoji: "📍", label: "Attraction Agent" },
      budget_agent: { emoji: "💰", label: "Budget Agent" },
    };

    const agents = agentTypes.map((type) => {
      const agentTasks = (tasks || []).filter((t) => t.agent_type === type);
      const latest = agentTasks[agentTasks.length - 1];
      const info = agentLabels[type];
      return {
        agent_type: type,
        emoji: info.emoji,
        label: info.label,
        status: latest?.status || "idle",
        result_summary: latest?.result_summary || null,
        task_count: agentTasks.length,
      };
    });

    const completedTasks = (tasks || []).filter((t) => t.status === "completed");
    const pendingTasks = (tasks || []).filter((t) => t.status === "pending");
    const runningTasks = (tasks || []).filter((t) => t.status === "running");

    return new Response(JSON.stringify({
      supervisor_status: latestRun?.status || "idle",
      current_step: latestRun?.current_step || null,
      agents,
      completed_count: completedTasks.length,
      pending_count: pendingTasks.length,
      running_count: runningTasks.length,
      total_tasks: (tasks || []).length,
      search_results_collected: (memories || []).length,
      itinerary_version: latestVersion?.version_number || 0,
      recent_logs: (recentLogs || []).reverse(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-progress-dashboard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
