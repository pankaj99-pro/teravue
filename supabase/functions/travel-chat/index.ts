import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are TERAVUE AI — a world-class travel planning assistant. You help users plan trips by creating detailed day-by-day itineraries.

IMPORTANT: Always respond in English only, regardless of the destination.

When a user asks you to plan a trip, you MUST call the "create_itinerary" tool with structured data. Always include a conversational English reply alongside the tool call.

Guidelines for itineraries:
- Create realistic times, locations, and prices
- Include a mix of sightseeing, food, and leisure
- Use well-known landmarks and restaurants
- Price in USD
- Each day should have 3-5 stops
- Always include arrival/departure logistics
- Use descriptive titles like "Senso-ji Temple (Morning Visit)" not just "Temple"
- All text fields MUST be in English
- CRITICAL: Every stop MUST include accurate "lat" and "lng" coordinates. Look up real GPS coordinates for each location. Without coordinates the map cannot display routes.

For the image field, use one of these categories to match the stop type:
- "airport" for airports/flights
- "hotel" for hotels/accommodation
- "restaurant" for dining
- "landmark" for sightseeing/attractions
- "activity" for experiences/tours
- "transport" for transportation

If the user asks a general travel question (not requesting a full itinerary), just answer conversationally in English without calling the tool.`;

const ITINERARY_TOOL = {
  type: "function",
  function: {
    name: "create_itinerary",
    description:
      "Create a structured travel itinerary. Call this when the user asks to plan a trip or create an itinerary.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Main destination city" },
        country: { type: "string", description: "Country name" },
        countryFlag: { type: "string", description: "Country flag emoji" },
        totalDays: { type: "number", description: "Total number of days" },
        dateRange: { type: "string", description: "Date range like 'Oct 12–16'" },
        travelers: { type: "string", description: "Traveler description like '2 Adults'" },
        avgBudget: {
          type: "string",
          description: "Average budget like '$1,200.00'",
        },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              date: { type: "string", description: "e.g. 'October 12'" },
              title: {
                type: "string",
                description: "Day theme like 'Arrival & Exploration'",
              },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    time: { type: "string", description: "e.g. '10:30 AM'" },
                    title: { type: "string" },
                    location: { type: "string" },
                    price: { type: "string", description: "e.g. '$130.00'" },
                    priceLabel: {
                      type: "string",
                      description: "e.g. 'per night'",
                    },
                    buttonLabel: {
                      type: "string",
                      description: "CTA like 'Book a Flight'",
                    },
                    image: {
                      type: "string",
                      description:
                        "Category: airport, hotel, restaurant, landmark, activity, transport",
                    },
                    lat: { type: "number", description: "Latitude" },
                    lng: { type: "number", description: "Longitude" },
                  },
                  required: [
                    "id",
                    "time",
                    "title",
                    "location",
                    "buttonLabel",
                    "image",
                  ],
                },
              },
            },
            required: ["day", "date", "title", "stops"],
          },
        },
      },
      required: [
        "destination",
        "country",
        "countryFlag",
        "totalDays",
        "dateRange",
        "travelers",
        "avgBudget",
        "days",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          tools: [ITINERARY_TOOL],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("travel-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
