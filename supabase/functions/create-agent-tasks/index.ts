import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_DEFINITIONS = [
  {
    agent_type: "flight_agent",
    task_template: (trip: any) =>
      `Search flights to ${trip.destination_city}, ${trip.destination_country}. Dates: ${trip.start_date} to ${trip.end_date}. Travelers: ${trip.travelers_count}.`,
  },
  {
    agent_type: "hotel_agent",
    task_template: (trip: any) =>
      `Search hotels in ${trip.destination_city} city center. Check-in: ${trip.start_date}, Check-out: ${trip.end_date}. Guests: ${trip.travelers_count}. Budget: $${trip.estimated_budget}.`,
  },
  {
    agent_type: "restaurant_agent",
    task_template: (trip: any) =>
      `Find top-rated local restaurants in ${trip.destination_city}. Prioritize authentic local cuisine and highly rated spots.`,
  },
  {
    agent_type: "attraction_agent",
    task_template: (trip: any) =>
      `Discover major attractions, museums, landmarks, tours, and experiences in ${trip.destination_city}, ${trip.destination_country}.`,
  },
  {
    agent_type: "budget_agent",
    task_template: (trip: any) =>
      `Analyze all collected costs (flights, hotels, activities) for the ${trip.destination_city} trip. Total budget: $${trip.estimated_budget}. Ensure itinerary stays within budget and suggest alternatives if over.`,
  },
  {
    agent_type: "train_agent",
    task_template: (trip: any) =>
      `Search train connections for travel to/from/between cities for the ${trip.destination_city} trip. Find available trains, routes, intermediate stops, and determine optimal multi-city travel order. Origin: ${trip.destination_city}. Dates: ${trip.start_date} to ${trip.end_date}.`,
  },
  {
    agent_type: "transport_agent",
    task_template: (trip: any) =>
      `Analyze distances between planned attractions in ${trip.destination_city} and determine optimal transportation modes (car, bike, walk, train) for each segment. Calculate routes for all modes.`,
  },
];

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

    const { trip_id, agent_run_id } = await req.json();
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

    // Check existing memory to skip redundant tasks
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("memory_type")
      .eq("trip_id", trip_id);

    const existingTypes = new Set((memories || []).map((m) => m.memory_type));

    const memoryTypeMap: Record<string, string> = {
      flight_agent: "flights_found",
      hotel_agent: "hotels_found",
      restaurant_agent: "restaurants_found",
      attraction_agent: "attractions_found",
      budget_agent: "budget_analysis",
      transport_agent: "routes_optimized",
    };

    // Create tasks only for agents whose data doesn't exist yet
    const tasksToCreate = AGENT_DEFINITIONS
      .filter((def) => {
        // Budget agent always runs (re-analyzes)
        if (def.agent_type === "budget_agent") return true;
        return !existingTypes.has(memoryTypeMap[def.agent_type]);
      })
      .map((def) => ({
        trip_id,
        agent_run_id: agent_run_id || null,
        agent_type: def.agent_type,
        task_description: def.task_template(trip),
        status: "pending",
      }));

    if (tasksToCreate.length === 0) {
      return new Response(JSON.stringify({ message: "All data already collected", tasks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tasks, error } = await supabase
      .from("agent_tasks")
      .insert(tasksToCreate)
      .select();

    if (error) throw error;

    // Log task creation
    await supabase.from("agent_logs").insert({
      trip_id,
      agent_run_id: agent_run_id || null,
      step_type: "thinking",
      message: `Supervisor created ${tasks?.length || 0} tasks: ${tasksToCreate.map((t) => t.agent_type).join(", ")}`,
    });

    return new Response(JSON.stringify({ tasks: tasks || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-agent-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
