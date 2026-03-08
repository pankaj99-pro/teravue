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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Fetch all user trips
    const { data: trips } = await supabase
      .from("trips")
      .select("id, destination_city, destination_country, start_date, end_date, estimated_budget, title")
      .eq("user_id", userId);

    const allTrips = trips || [];
    const today = new Date().toISOString().split("T")[0];

    const totalTrips = allTrips.length;
    const destinations = new Set(allTrips.map(t => `${t.destination_city}, ${t.destination_country}`).filter(Boolean));
    const totalDestinations = destinations.size;

    const budgets = allTrips.map(t => Number(t.estimated_budget)).filter(b => b > 0);
    const avgTripCost = budgets.length ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0;

    const upcomingTrips = allTrips
      .filter(t => t.start_date && t.start_date >= today)
      .sort((a, b) => (a.start_date! > b.start_date! ? 1 : -1))
      .slice(0, 5);

    // Fetch booking stats
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Fetch unread notifications
    const { count: unreadNotifications } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    return new Response(JSON.stringify({
      total_trips: totalTrips,
      total_destinations: totalDestinations,
      average_trip_cost: Math.round(avgTripCost * 100) / 100,
      upcoming_trips: upcomingTrips,
      total_bookings: totalBookings || 0,
      unread_notifications: unreadNotifications || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dashboard-analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
