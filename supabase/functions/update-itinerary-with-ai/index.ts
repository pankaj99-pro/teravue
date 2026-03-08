import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UPDATE_TOOL = {
  type: "function",
  function: {
    name: "return_updated_itinerary",
    description: "Return the updated itinerary after applying user changes",
    parameters: {
      type: "object",
      properties: {
        changes_summary: { type: "string" },
        updated_days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day_number: { type: "number" },
              date: { type: "string" },
              summary: { type: "string" },
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    start_time: { type: "string" },
                    end_time: { type: "string" },
                    activity_type: { type: "string" },
                    location_name: { type: "string" },
                    price_estimate: { type: "number" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                  required: ["title", "activity_type"],
                },
              },
            },
            required: ["day_number", "summary", "activities"],
          },
        },
      },
      required: ["changes_summary", "updated_days"],
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

    const { trip_id, user_message } = await req.json();
    if (!trip_id || !user_message) {
      return new Response(JSON.stringify({ error: "trip_id and user_message are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current trip and itinerary
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Current trip: ${trip.title}
Destination: ${trip.destination_city}, ${trip.destination_country}
Dates: ${trip.start_date} to ${trip.end_date}

Current itinerary:
${JSON.stringify(days, null, 2)}

User request: "${user_message}"

Apply the user's requested change to the itinerary. Return the COMPLETE updated itinerary with all days and activities, not just the changed parts. Maintain existing activities that weren't mentioned. Be smart about time management — if moving or adding activities, adjust surrounding times accordingly.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a travel itinerary editor. Apply user modifications precisely while maintaining the overall trip structure and time constraints." },
          { role: "user", content: prompt },
        ],
        tools: [UPDATE_TOOL],
        tool_choice: { type: "function", function: { name: "return_updated_itinerary" } },
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
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!result) {
      return new Response(JSON.stringify({ error: "AI could not process the change" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save version before modifying
    const { data: lastVersion } = await supabase
      .from("itinerary_versions")
      .select("version_number")
      .eq("trip_id", trip_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_number || 0) + 1;

    await supabase.from("itinerary_versions").insert({
      trip_id,
      version_number: nextVersion,
      itinerary_data: { days: result.updated_days, changes_summary: result.changes_summary },
    });

    // Update trip_days and activities in database
    if (result.updated_days) {
      for (const day of result.updated_days) {
        // Find or create trip_day
        const { data: existingDay } = await supabase
          .from("trip_days")
          .select("id")
          .eq("trip_id", trip_id)
          .eq("day_number", day.day_number)
          .single();

        let dayId: string;

        if (existingDay) {
          dayId = existingDay.id;
          await supabase.from("trip_days").update({ summary: day.summary, date: day.date }).eq("id", dayId);
          // Clear old activities
          await supabase.from("activities").delete().eq("trip_day_id", dayId);
        } else {
          const { data: newDay } = await supabase
            .from("trip_days")
            .insert({ trip_id, day_number: day.day_number, summary: day.summary, date: day.date })
            .select()
            .single();
          dayId = newDay!.id;
        }

        // Insert updated activities
        if (day.activities && day.activities.length > 0) {
          const activityInserts = day.activities.map((a: any) => ({
            trip_day_id: dayId,
            title: a.title,
            start_time: a.start_time || null,
            end_time: a.end_time || null,
            activity_type: a.activity_type || null,
            location_name: a.location_name || null,
            price_estimate: a.price_estimate || null,
            latitude: a.latitude || null,
            longitude: a.longitude || null,
          }));
          await supabase.from("activities").insert(activityInserts);
        }
      }
    }

    return new Response(JSON.stringify({
      changes_summary: result.changes_summary,
      version: nextVersion,
      updated_days: result.updated_days,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-itinerary-with-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
