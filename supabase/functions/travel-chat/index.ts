import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are TERAVUE AI — a world-class agentic travel planner. You help users plan trips by researching flights, hotels, restaurants, and attractions, then building a detailed day-by-day itinerary.

IMPORTANT: Always respond in English only, regardless of the destination.

## Agentic Workflow
When a user asks you to plan a trip, follow this sequential process:
1. First call "search_flights" to find flight options
2. Then call "search_hotels" to find accommodation
3. Then call "search_restaurants" to find dining options
4. Then call "search_attractions" to find must-visit places
5. Finally call "create_itinerary" to build the complete itinerary using ALL the research data

You MUST call these tools one at a time in sequence. After each tool result, briefly acknowledge what you found and proceed to the next tool.

## ROUTE OPTIMIZATION RULES (CRITICAL)
When building the final itinerary with create_itinerary, you MUST follow these optimization rules:

### 1. Visit Sequence Optimization (Nearest-Neighbor)
For each day, order attractions to minimize total travel distance:
- Analyze all selected stops for the day
- Start from the hotel or previous day's last location
- Visit the nearest unvisited location next
- Cluster geographically close attractions on the same day
- AVOID backtracking (e.g. going north, then south, then north again)

Example — WRONG order: Colosseum → Trevi Fountain → Roman Forum → Pantheon
CORRECT order: Colosseum → Roman Forum → Pantheon → Trevi Fountain
(because Roman Forum is next to Colosseum, Pantheon is between Forum and Trevi)

### 2. Daily Starting Location Continuity
Each day MUST begin near the last location visited the previous day:
- Day 1 ends at "Trastevere Restaurant" → Day 2 starts from Trastevere area
- This avoids unnecessary cross-city travel each morning
- The hotel can serve as the starting point for Day 1

### 3. Transport Mode Selection
Between each stop, mentally calculate the approximate distance and select transport:
- distance < 2 km → Walk (free, healthy, scenic)
- distance 2–6 km → Bike (cheap, moderate speed)
- distance > 6 km → Public transport / Metro / Train
- Car/taxi → Only when no other option or late at night
Always minimize expensive transport. Prefer walking when possible.

### 4. Route Information in Stop Titles
When practical, hint at travel between stops in the title or location field.

## Itinerary Guidelines
- Create realistic times, locations, and prices
- Include a mix of sightseeing, food, and leisure
- Use well-known landmarks and restaurants
- Price in USD
- Each day should have 3-5 stops
- Always include arrival/departure logistics
- Use descriptive titles like "Senso-ji Temple (Morning Visit)" not just "Temple"
- All text fields MUST be in English
- CRITICAL: Every stop MUST include accurate "lat" and "lng" coordinates

For the image field, use one of these categories:
- "airport" for airports/flights
- "hotel" for hotels/accommodation
- "restaurant" for dining
- "landmark" for sightseeing/attractions
- "activity" for experiences/tours
- "transport" for transportation

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

const CREATE_ITINERARY_TOOL = {
  type: "function",
  function: {
    name: "create_itinerary",
    description: "Create the final structured travel itinerary. Call this LAST after all research is done.",
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
                    buttonLabel: { type: "string", description: "CTA like 'Book a Flight'" },
                    image: { type: "string", description: "Category: airport, hotel, restaurant, landmark, activity, transport" },
                    lat: { type: "number", description: "Latitude" },
                    lng: { type: "number", description: "Longitude" },
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

const TOOL_EXECUTORS: Record<string, (args: any, apiKey: string) => Promise<string>> = {
  search_flights: executeSearchFlights,
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
