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

    // Fetch agent run status
    const { data: runs } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestRun = runs?.[0] || null;

    // Fetch memory count by type
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("memory_type")
      .eq("trip_id", trip_id);

    const memoryStats: Record<string, number> = {};
    for (const m of memories || []) {
      memoryStats[m.memory_type] = (memoryStats[m.memory_type] || 0) + 1;
    }

    // Fetch latest itinerary version
    const { data: latestVersion } = await supabase
      .from("itinerary_versions")
      .select("version_number, created_at")
      .eq("trip_id", trip_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    // Fetch agent logs count
    const { data: logs } = await supabase
      .from("agent_logs")
      .select("step_type")
      .eq("trip_id", trip_id);

    const logStats: Record<string, number> = {};
    for (const l of logs || []) {
      logStats[l.step_type] = (logStats[l.step_type] || 0) + 1;
    }

    // Determine completed/remaining tasks
    const allTasks = ["search_flights", "search_hotels", "search_restaurants", "search_attractions", "build_itinerary"];
    const completedTasks = allTasks.filter((t) => {
      const memType = t.replace("search_", "") + "_found";
      return memoryStats[memType] || (t === "build_itinerary" && memoryStats["itinerary_draft"]);
    });
    const remainingTasks = allTasks.filter((t) => !completedTasks.includes(t));

    return new Response(JSON.stringify({
      agent_status: latestRun?.status || "no_runs",
      current_step: latestRun?.current_step || null,
      completed_tasks: completedTasks,
      remaining_tasks: remainingTasks,
      current_itinerary_version: latestVersion?.version_number || 0,
      total_search_results: Object.values(memoryStats).reduce((a, b) => a + b, 0),
      memory_breakdown: memoryStats,
      log_breakdown: logStats,
      last_run_at: latestRun?.created_at || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-trip-agent-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
