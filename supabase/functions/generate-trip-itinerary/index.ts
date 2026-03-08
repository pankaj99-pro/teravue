import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ITINERARY_TOOL = {
  type: "function",
  function: {
    name: "create_trip_itinerary",
    description: "Generate a structured multi-day travel itinerary",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Trip title" },
        destination_city: { type: "string" },
        destination_country: { type: "string" },
        estimated_budget: { type: "number" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day_number: { type: "number" },
              date: { type: "string", description: "ISO date string" },
              summary: { type: "string" },
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    location_name: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    activity_type: { type: "string", enum: ["flight", "hotel", "restaurant", "attraction", "transport"] },
                    start_time: { type: "string" },
                    end_time: { type: "string" },
                    price_estimate: { type: "number" },
                    booking_url: { type: "string" },
                    image_url: { type: "string" },
                  },
                  required: ["title", "location_name", "activity_type"],
                },
              },
            },
            required: ["day_number", "summary", "activities"],
          },
        },
      },
      required: ["title", "destination_city", "destination_country", "days"],
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { destination, trip_length_days, budget, travelers, interests, start_date } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Plan a ${trip_length_days}-day trip to ${destination} for ${travelers || 1} traveler(s).
Budget: $${budget || "flexible"}.
Interests: ${(interests || ["general"]).join(", ")}.
Start date: ${start_date || "upcoming"}.
Generate a complete day-by-day itinerary with realistic locations, times, and prices.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a world-class travel planner. Generate detailed, realistic itineraries using the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [ITINERARY_TOOL],
        tool_choice: { type: "function", function: { name: "create_trip_itinerary" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured itinerary");

    const itinerary = JSON.parse(toolCall.function.arguments);

    // Store trip
    const { data: trip, error: tripError } = await supabase.from("trips").insert({
      user_id: userId,
      title: itinerary.title,
      destination_city: itinerary.destination_city,
      destination_country: itinerary.destination_country,
      start_date: start_date || null,
      end_date: start_date ? new Date(new Date(start_date).getTime() + (trip_length_days - 1) * 86400000).toISOString().split("T")[0] : null,
      travelers_count: travelers || 1,
      estimated_budget: itinerary.estimated_budget || budget || null,
      ai_generated: true,
    }).select().single();

    if (tripError) throw new Error(`Failed to save trip: ${tripError.message}`);

    // Store days and activities
    for (const day of itinerary.days) {
      const { data: tripDay, error: dayError } = await supabase.from("trip_days").insert({
        trip_id: trip.id,
        day_number: day.day_number,
        date: day.date || null,
        summary: day.summary,
      }).select().single();

      if (dayError) {
        console.error("Failed to save day:", dayError);
        continue;
      }

      if (day.activities?.length) {
        const activitiesData = day.activities.map((a: any) => ({
          trip_day_id: tripDay.id,
          title: a.title,
          location_name: a.location_name,
          latitude: a.latitude || null,
          longitude: a.longitude || null,
          activity_type: a.activity_type,
          start_time: a.start_time || null,
          end_time: a.end_time || null,
          price_estimate: a.price_estimate || null,
          booking_url: a.booking_url || null,
          image_url: a.image_url || null,
        }));

        const { error: actError } = await supabase.from("activities").insert(activitiesData);
        if (actError) console.error("Failed to save activities:", actError);
      }
    }

    return new Response(JSON.stringify({ trip_id: trip.id, itinerary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trip-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
