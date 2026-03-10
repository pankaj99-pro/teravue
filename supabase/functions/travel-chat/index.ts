import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are TERAVUE AI — a world-class agentic travel planner. You help users plan trips by researching flights, trains, hotels, restaurants, and attractions, then building a detailed day-by-day itinerary.

IMPORTANT: Always respond in English only, regardless of the destination.

## Transport Mode Detection
- If the user mentions "train", "rail", "railway", or specific train names → use "search_trains" instead of "search_flights"
- If the user mentions "flight", "fly", "airplane" → use "search_flights"
- If not specified, default to "search_flights"

## Agentic Workflow
When a user asks you to plan a trip, follow this sequential process:
1. First call "search_flights" OR "search_trains" (based on user preference) to find transport options
2. Then call "search_hotels" to find accommodation
3. Then call "search_restaurants" to find dining options
4. Then call "search_attractions" to find must-visit places
5. Finally call "create_itinerary" to build the complete itinerary using ALL the research data

You MUST call these tools one at a time in sequence. After each tool result, briefly acknowledge what you found and proceed to the next tool.

## ROUTE OPTIMIZATION RULES (CRITICAL)
When building the final itinerary with create_itinerary, you MUST follow these optimization rules:

### 1. ABSOLUTE RULE — Complete Each City Before Moving On
For multi-city trips, once you arrive in a city, you MUST explore ALL planned attractions, restaurants, and activities in that city before traveling to the next city. NEVER leave a city and return to it later.

WRONG pattern (backtracking):
- Day 1: Travel to Agra
- Day 2: Travel to Vrindavan
- Day 3: Return to Agra ← VIOLATION
- Day 4: Return to Vrindavan ← VIOLATION

CORRECT pattern (forward progression):
- Day 1: Travel to Agra
- Day 2: Explore ALL Agra attractions (Taj Mahal, Agra Fort, etc.)
- Day 3: Travel Agra → Vrindavan, explore Vrindavan
- Day 4: Continue Vrindavan attractions, then return home

### 2. City Visit Sequence (Geographic Logic)
Determine the optimal order of cities BEFORE scheduling days:
- Analyze which cities are along the same route/train line
- Visit cities in geographic sequence (no zigzagging)
- Example: If route is Origin → City A → City B → Origin, visit A fully, then B fully

### 3. Visit Sequence Within a City (Nearest-Neighbor)
Within each city, order attractions to minimize travel distance:
- Start from the hotel or previous day's last location
- Visit the nearest unvisited location next
- Cluster geographically close attractions on the same day
- AVOID intra-city backtracking

### 4. Daily Starting Location Continuity
Each day MUST begin near the last location visited the previous day.

### 5. Transport Mode Selection
Between each stop, select transport by distance:
- distance < 2 km → Walk (free, healthy, scenic)
- distance 2–6 km → Bike (cheap, moderate speed)
- distance > 6 km → Public transport / Metro / Train
- Car/taxi → Only when no other option or late at night

### 6. Train-Based Multi-City Planning
When using trains for inter-city travel:
- Set the stop's "image" to "train"
- Include trainNumber, trainName, departureTime, arrivalTime, and intermediateStops
- Title format: "City A → City B (Train 12345)"
- Visit cities in the order that follows the train route to minimize backtracking

## Itinerary Guidelines
- Create realistic times, locations, and prices
- Include a mix of sightseeing, food, and leisure
- Use well-known landmarks and restaurants
- Price in USD
- Each day should have 3-5 stops
- Always include arrival/departure logistics
- Use descriptive titles
- All text fields MUST be in English
- CRITICAL: Every stop MUST include accurate "lat" and "lng" coordinates
- CRITICAL: Between each stop, add a brief transport hint in the title
- CRITICAL: The FIRST stop of Day 2, 3, 4... MUST be geographically near the LAST stop of the previous day
- CRITICAL: Within each day, sort stops by geographic proximity

For the image field, use one of these categories:
- "airport" for airports/flights
- "hotel" for hotels/accommodation
- "restaurant" for dining
- "landmark" for sightseeing/attractions
- "activity" for experiences/tours
- "transport" for transportation
- "train" for train journeys (inter-city rail travel)

If the user asks a general travel question (not requesting a full itinerary), just answer conversationally without calling tools.`;

// ── Tool Definitions ──

const SEARCH_FLIGHTS_TOOL = {
  type: "function",
  function: {
    name: "search_flights",
    description: "Search for flights between cities. Call this first when planning a trip.",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Departure city" },
        destination: { type: "string", description: "Arrival city" },
        date: { type: "string", description: "Departure date (YYYY-MM-DD)" },
        return_date: { type: "string", description: "Return date (YYYY-MM-DD)" },
        passengers: { type: "number", description: "Number of passengers" },
      },
      required: ["origin", "destination", "date", "passengers"],
    },
  },
};

const SEARCH_HOTELS_TOOL = {
  type: "function",
  function: {
    name: "search_hotels",
    description: "Search for hotels in a city. Call after finding flights.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City to search hotels in" },
        checkin: { type: "string", description: "Check-in date" },
        checkout: { type: "string", description: "Check-out date" },
        guests: { type: "number", description: "Number of guests" },
        budget_per_night: { type: "number", description: "Max budget per night in USD" },
      },
      required: ["city", "checkin", "checkout", "guests"],
    },
  },
};

const SEARCH_RESTAURANTS_TOOL = {
  type: "function",
  function: {
    name: "search_restaurants",
    description: "Search for highly-rated restaurants in a city. Call after finding hotels.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City to search restaurants in" },
        cuisine: { type: "string", description: "Preferred cuisine type (optional)" },
        budget: { type: "string", description: "Budget range: $, $$, $$$, $$$$" },
      },
      required: ["city"],
    },
  },
};

const SEARCH_ATTRACTIONS_TOOL = {
  type: "function",
  function: {
    name: "search_attractions",
    description: "Search for must-visit attractions and landmarks. Call after finding restaurants.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City to search attractions in" },
        interests: { type: "string", description: "Traveler interests (history, art, nature, etc.)" },
        days: { type: "number", description: "Number of days available" },
      },
      required: ["city"],
    },
  },
};

const SEARCH_TRAINS_TOOL = {
  type: "function",
  function: {
    name: "search_trains",
    description: "Search for train connections between cities. Use this instead of search_flights when the user wants to travel by train.",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Departure city" },
        destination: { type: "string", description: "Arrival city" },
        date: { type: "string", description: "Travel date (YYYY-MM-DD)" },
        destinations: { type: "array", items: { type: "string" }, description: "Multiple destination cities for multi-city route optimization" },
      },
      required: ["origin"],
    },
  },
};

const CREATE_ITINERARY_TOOL = {
  type: "function",
  function: {
    name: "create_itinerary",
    description: "Create the final structured travel itinerary. Call this LAST after all research is done. CRITICAL: Order stops using nearest-neighbor (closest unvisited next). Day N+1 MUST start from Day N's last stop location. For train trips, include trainNumber, trainName, departureTime, arrivalTime, and intermediateStops.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Main destination city" },
        country: { type: "string", description: "Country name" },
        countryFlag: { type: "string", description: "Country flag emoji" },
        totalDays: { type: "number", description: "Total number of days" },
        dateRange: { type: "string", description: "Date range like 'Oct 12–16'" },
        travelers: { type: "string", description: "Traveler description like '2 Adults'" },
        avgBudget: { type: "string", description: "Average budget like '$1,200.00'" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              date: { type: "string", description: "e.g. 'October 12'" },
              title: { type: "string", description: "Day theme like 'Arrival & Exploration'" },
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
                    priceLabel: { type: "string", description: "e.g. 'per night'" },
                    buttonLabel: { type: "string", description: "CTA like 'Book a Flight' or 'View Train'" },
                    image: { type: "string", description: "Category: airport, hotel, restaurant, landmark, activity, transport, train" },
                    lat: { type: "number", description: "Latitude" },
                    lng: { type: "number", description: "Longitude" },
                    trainNumber: { type: "string", description: "Train number (for train stops)" },
                    trainName: { type: "string", description: "Train name (for train stops)" },
                    departureTime: { type: "string", description: "Departure time (for train stops, e.g. '08:30 AM')" },
                    arrivalTime: { type: "string", description: "Arrival time (for train stops, e.g. '02:45 PM')" },
                    intermediateStops: { type: "array", items: { type: "string" }, description: "Key intermediate stations for train journeys" },
                    platform: { type: "string", description: "Platform number (for train stops)" },
                  },
                  required: ["id", "time", "title", "location", "buttonLabel", "image", "lat", "lng"],
                },
              },
            },
            required: ["day", "date", "title", "stops"],
          },
        },
      },
      required: ["destination", "country", "countryFlag", "totalDays", "dateRange", "travelers", "avgBudget", "days"],
      additionalProperties: false,
    },
  },
};

const ALL_TOOLS = [
  SEARCH_FLIGHTS_TOOL,
  SEARCH_TRAINS_TOOL,
  SEARCH_HOTELS_TOOL,
  SEARCH_RESTAURANTS_TOOL,
  SEARCH_ATTRACTIONS_TOOL,
  CREATE_ITINERARY_TOOL,
];

// ── Tool Executors (server-side) ──

async function executeSearchFlights(args: any, apiKey: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Generate 3-4 realistic flight options with real airlines. Include prices, times, and durations. Return as JSON." },
        { role: "user", content: `Flights from ${args.origin} to ${args.destination} on ${args.date}. Passengers: ${args.passengers}. ${args.return_date ? `Return: ${args.return_date}` : "One way."}` },
      ],
    }),
  });
  if (!resp.ok) return JSON.stringify({ error: "Flight search unavailable", flights: [] });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || JSON.stringify({ flights: [] });
}

async function executeSearchHotels(args: any, apiKey: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Generate 3-4 realistic hotel recommendations with real hotel names, ratings, prices, and locations. Include latitude/longitude. Return as JSON." },
        { role: "user", content: `Hotels in ${args.city}. Check-in: ${args.checkin}, Check-out: ${args.checkout}. Guests: ${args.guests}. ${args.budget_per_night ? `Max $${args.budget_per_night}/night` : ""}` },
      ],
    }),
  });
  if (!resp.ok) return JSON.stringify({ error: "Hotel search unavailable", hotels: [] });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || JSON.stringify({ hotels: [] });
}

async function executeSearchRestaurants(args: any, apiKey: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Generate 5-6 realistic restaurant recommendations with real names, cuisine types, ratings, price ranges, and locations. Return as JSON." },
        { role: "user", content: `Restaurants in ${args.city}. ${args.cuisine ? `Cuisine: ${args.cuisine}.` : ""} ${args.budget ? `Budget: ${args.budget}.` : ""}` },
      ],
    }),
  });
  if (!resp.ok) return JSON.stringify({ error: "Restaurant search unavailable", restaurants: [] });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || JSON.stringify({ restaurants: [] });
}

async function executeSearchAttractions(args: any, apiKey: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Generate 8-10 must-visit attractions with real names, descriptions, entry fees, opening hours, and GPS coordinates. Return as JSON." },
        { role: "user", content: `Top attractions in ${args.city}. ${args.interests ? `Interests: ${args.interests}.` : ""} ${args.days ? `${args.days} days available.` : ""}` },
      ],
    }),
  });
  if (!resp.ok) return JSON.stringify({ error: "Attraction search unavailable", attractions: [] });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || JSON.stringify({ attractions: [] });
}

async function executeSearchTrains(args: any, apiKey: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Generate realistic train options between cities. Include train numbers, names, departure/arrival times, duration, intermediate stops, classes, and prices. For multi-city trips, analyze the route and determine the optimal visiting order based on train routes and intermediate stations. Return as JSON." },
        { role: "user", content: `Trains from ${args.origin} to ${args.destination || (args.destinations || []).join(", ")}. ${args.date ? `Date: ${args.date}.` : ""} ${args.destinations ? `Multi-city destinations: ${args.destinations.join(", ")}. Determine optimal visiting order based on train route connections.` : ""}` },
      ],
    }),
  });
  if (!resp.ok) return JSON.stringify({ error: "Train search unavailable", trains: [] });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || JSON.stringify({ trains: [] });
}

const TOOL_EXECUTORS: Record<string, (args: any, apiKey: string) => Promise<string>> = {
  search_flights: executeSearchFlights,
  search_trains: executeSearchTrains,
  search_hotels: executeSearchHotels,
  search_restaurants: executeSearchRestaurants,
  search_attractions: executeSearchAttractions,
};

// ── SSE helpers ──

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseData(data: string): string {
  return `data: ${data}\n\n`;
}

// ── Main agent loop ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (text: string) => controller.enqueue(encoder.encode(text));

        // Conversation messages accumulate tool results
        const agentMessages: any[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ];

        const MAX_ITERATIONS = 8;
        let iteration = 0;

        try {
          while (iteration < MAX_ITERATIONS) {
            iteration++;

            const aiResponse = await fetch(AI_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "openai/gpt-5-mini",
                messages: agentMessages,
                tools: ALL_TOOLS,
                stream: true,
              }),
            });

            if (!aiResponse.ok) {
              const status = aiResponse.status;
              if (status === 429) {
                send(sseData(JSON.stringify({ error: { message: "Rate limit exceeded. Please try again in a moment." } })));
                break;
              }
              if (status === 402) {
                send(sseData(JSON.stringify({ error: { message: "Usage limit reached." } })));
                break;
              }
              const text = await aiResponse.text();
              console.error("AI gateway error:", status, text);
              send(sseData(JSON.stringify({ error: { message: "AI service unavailable" } })));
              break;
            }

            // Parse the streamed response to extract text + tool calls
            const reader = aiResponse.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let assistantText = "";
            let toolCalls: { name: string; arguments: string }[] = [];
            let currentToolIdx = -1;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              let nlIdx: number;
              while ((nlIdx = buffer.indexOf("\n")) !== -1) {
                let line = buffer.slice(0, nlIdx);
                buffer = buffer.slice(nlIdx + 1);
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ") || line.trim() === "") continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") break;

                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.error) {
                    send(sseData(JSON.stringify({ error: parsed.error })));
                    controller.close();
                    return;
                  }

                  const choice = parsed.choices?.[0];
                  if (!choice) continue;

                  if (choice.finish_reason === "error") {
                    send(sseData(JSON.stringify({ error: { message: "AI failed to generate. Please try again." } })));
                    controller.close();
                    return;
                  }

                  const delta = choice.delta;

                  // Stream text content to the client
                  if (delta?.content) {
                    assistantText += delta.content;
                    // Forward as standard SSE for text streaming
                    send(sseData(jsonStr));
                  }

                  // Accumulate tool calls
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (tc.index !== undefined && tc.index !== currentToolIdx) {
                        currentToolIdx = tc.index;
                        toolCalls.push({ name: "", arguments: "" });
                      }
                      const current = toolCalls[toolCalls.length - 1];
                      if (current) {
                        if (tc.function?.name) current.name = tc.function.name;
                        if (tc.function?.arguments) current.arguments += tc.function.arguments;
                      }
                    }
                  }
                } catch {
                  // partial JSON
                }
              }
            }

            // If no tool calls, we're done - the text was already streamed
            if (toolCalls.length === 0) {
              // Add the assistant message to history (for completeness)
              if (assistantText) {
                agentMessages.push({ role: "assistant", content: assistantText });
              }
              break;
            }

            // We have tool calls to execute
            // Add the assistant message with tool_calls to conversation
            const assistantMsg: any = {
              role: "assistant",
              content: assistantText || null,
              tool_calls: toolCalls.map((tc, i) => ({
                id: `call_${iteration}_${i}`,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              })),
            };
            agentMessages.push(assistantMsg);

            // Execute each tool call
            for (let i = 0; i < toolCalls.length; i++) {
              const tc = toolCalls[i];
              const toolId = `call_${iteration}_${i}`;

              if (tc.name === "create_itinerary") {
                // Final tool — send as tool_call SSE events for the frontend to handle
                send(sseEvent("tool_start", { name: tc.name }));

                // Forward the create_itinerary tool call as standard SSE so the frontend can parse it
                // We need to send it as delta tool_calls chunks
                send(sseData(JSON.stringify({
                  choices: [{
                    delta: {
                      tool_calls: [{ index: 0, function: { name: tc.name, arguments: tc.arguments } }]
                    }
                  }]
                })));

                send(sseEvent("tool_done", { name: tc.name }));

                // Add a tool response to continue the conversation (though we'll break after)
                agentMessages.push({
                  role: "tool",
                  tool_call_id: toolId,
                  content: "Itinerary created and sent to the user.",
                });

                // Signal done
                send(sseData("[DONE]"));
                controller.close();
                return;
              }

              // For research tools, execute server-side
              send(sseEvent("tool_start", { name: tc.name }));

              let result: string;
              const executor = TOOL_EXECUTORS[tc.name];
              if (executor) {
                let parsedArgs: any;
                try {
                  parsedArgs = JSON.parse(tc.arguments);
                } catch {
                  parsedArgs = {};
                }
                result = await executor(parsedArgs, LOVABLE_API_KEY);
              } else {
                result = JSON.stringify({ error: `Unknown tool: ${tc.name}` });
              }

              send(sseEvent("tool_done", { name: tc.name }));

              // Add tool result to conversation for the next AI iteration
              agentMessages.push({
                role: "tool",
                tool_call_id: toolId,
                content: result,
              });
            }

            // Loop continues — AI will see the tool results and decide next action
          }

          send(sseData("[DONE]"));
        } catch (e) {
          console.error("Agent loop error:", e);
          send(sseData(JSON.stringify({ error: { message: e instanceof Error ? e.message : "Agent error" } })));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("travel-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
