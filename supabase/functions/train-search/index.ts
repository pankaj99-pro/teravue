import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAILRADAR_BASE = "https://api.railradar.org";

async function railradarFetch(path: string, apiKey: string) {
  const resp = await fetch(`${RAILRADAR_BASE}${path}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!resp.ok) {
    throw new Error(`RailRadar API error ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

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

    const RAILRADAR_API_KEY = Deno.env.get("RAILRADAR_API_KEY");
    if (!RAILRADAR_API_KEY) {
      return new Response(JSON.stringify({ error: "RAILRADAR_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    let result: unknown;

    switch (action) {
      case "search_stations": {
        // Search for stations by name/code
        const { query } = body;
        if (!query) throw new Error("query is required for search_stations");
        result = await railradarFetch(`/api/v1/search/stations?q=${encodeURIComponent(query)}`, RAILRADAR_API_KEY);
        break;
      }

      case "search_trains": {
        // Search for trains by name/number
        const { query } = body;
        if (!query) throw new Error("query is required for search_trains");
        result = await railradarFetch(`/api/v1/search/trains?q=${encodeURIComponent(query)}`, RAILRADAR_API_KEY);
        break;
      }

      case "trains_between_stations": {
        // Find trains between two stations
        const { from_station, to_station } = body;
        if (!from_station || !to_station) throw new Error("from_station and to_station are required");
        result = await railradarFetch(
          `/api/v1/trains-between-stations?from=${encodeURIComponent(from_station)}&to=${encodeURIComponent(to_station)}`,
          RAILRADAR_API_KEY
        );
        break;
      }

      case "train_route": {
        // Get the full route/schedule of a specific train
        const { train_number } = body;
        if (!train_number) throw new Error("train_number is required");
        result = await railradarFetch(
          `/api/v1/trains/${encodeURIComponent(train_number)}/schedule`,
          RAILRADAR_API_KEY
        );
        break;
      }

      case "train_status": {
        // Get live running status of a train
        const { train_number, date } = body;
        if (!train_number) throw new Error("train_number is required");
        const datePart = date ? `?date=${encodeURIComponent(date)}` : "";
        result = await railradarFetch(
          `/api/v1/trains/${encodeURIComponent(train_number)}/status${datePart}`,
          RAILRADAR_API_KEY
        );
        break;
      }

      case "multi_city_route_analysis": {
        // Analyze optimal route order for multiple cities using train connections
        const { origin, destinations } = body;
        if (!origin || !destinations?.length) throw new Error("origin and destinations[] are required");

        // Step 1: Search station codes for all cities
        const allCities = [origin, ...destinations];
        const stationMap: Record<string, { code: string; name: string }> = {};

        for (const city of allCities) {
          try {
            const stationResult = await railradarFetch(
              `/api/v1/search/stations?q=${encodeURIComponent(city)}`,
              RAILRADAR_API_KEY
            );
            const stations = stationResult?.stations || stationResult?.data || stationResult || [];
            const stationList = Array.isArray(stations) ? stations : [];
            if (stationList.length > 0) {
              const s = stationList[0];
              stationMap[city] = { code: s.code || s.station_code || city, name: s.name || s.station_name || city };
            } else {
              stationMap[city] = { code: city.substring(0, 3).toUpperCase(), name: city };
            }
          } catch {
            stationMap[city] = { code: city.substring(0, 3).toUpperCase(), name: city };
          }
        }

        // Step 2: Find trains between origin and each destination + between all destination pairs
        const connections: Array<{
          from: string;
          to: string;
          from_code: string;
          to_code: string;
          trains: unknown[];
          intermediate_stops: string[];
        }> = [];

        const cityPairs: Array<[string, string]> = [];
        // Origin to each destination
        for (const dest of destinations) {
          cityPairs.push([origin, dest]);
        }
        // Between destinations
        for (let i = 0; i < destinations.length; i++) {
          for (let j = i + 1; j < destinations.length; j++) {
            cityPairs.push([destinations[i], destinations[j]]);
          }
        }
        // Each destination back to origin (for return)
        for (const dest of destinations) {
          cityPairs.push([dest, origin]);
        }

        for (const [from, to] of cityPairs) {
          try {
            const fromCode = stationMap[from]?.code || from;
            const toCode = stationMap[to]?.code || to;
            const trainsBetween = await railradarFetch(
              `/api/v1/trains-between-stations?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}`,
              RAILRADAR_API_KEY
            );

            const trainList = trainsBetween?.trains || trainsBetween?.data || trainsBetween || [];
            const trains = Array.isArray(trainList) ? trainList : [];

            // For the first train found, get its route to find intermediate stops
            let intermediateStops: string[] = [];
            if (trains.length > 0) {
              const firstTrain = trains[0];
              const trainNo = firstTrain.train_number || firstTrain.number || firstTrain.trainNo;
              if (trainNo) {
                try {
                  const routeData = await railradarFetch(
                    `/api/v1/trains/${encodeURIComponent(trainNo)}/schedule`,
                    RAILRADAR_API_KEY
                  );
                  const route = routeData?.route || routeData?.schedule || routeData?.stops || routeData || [];
                  const routeList = Array.isArray(route) ? route : [];
                  // Extract station names along the route
                  intermediateStops = routeList.map((s: any) =>
                    s.station_name || s.stationName || s.name || s.station || ""
                  ).filter(Boolean);
                } catch {
                  // Route fetch failed, continue without intermediate stops
                }
              }
            }

            connections.push({
              from,
              to,
              from_code: stationMap[from]?.code || from,
              to_code: stationMap[to]?.code || to,
              trains: trains.slice(0, 5), // Top 5 trains
              intermediate_stops: intermediateStops,
            });
          } catch {
            connections.push({
              from,
              to,
              from_code: stationMap[from]?.code || from,
              to_code: stationMap[to]?.code || to,
              trains: [],
              intermediate_stops: [],
            });
          }
        }

        // Step 3: Use AI to determine optimal city visit order
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

        const routeOptTool = {
          type: "function",
          function: {
            name: "return_optimal_route",
            description: "Return the optimal city visiting order based on train route analysis",
            parameters: {
              type: "object",
              properties: {
                optimal_order: {
                  type: "array",
                  items: { type: "string" },
                  description: "Cities in optimal visiting order, starting and ending with origin",
                },
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      from: { type: "string" },
                      to: { type: "string" },
                      recommended_train: { type: "string" },
                      train_number: { type: "string" },
                      departure_time: { type: "string" },
                      arrival_time: { type: "string" },
                      duration: { type: "string" },
                      intermediate_stops: { type: "array", items: { type: "string" } },
                    },
                    required: ["from", "to"],
                  },
                },
                reasoning: { type: "string" },
                total_travel_time: { type: "string" },
                cities_on_same_route: {
                  type: "array",
                  items: { type: "string" },
                  description: "Cities that appear on the same train route and should be visited in sequence",
                },
              },
              required: ["optimal_order", "segments", "reasoning"],
            },
          },
        };

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a train route optimizer for Indian Railways. Analyze train connections and intermediate stops to determine the most efficient multi-city visiting order. 
                
Key rules:
- Minimize total travel distance and backtracking
- If multiple destinations appear along the same train route, visit them in route order
- Prefer direct trains over connections
- Consider travel time and train frequency
- The route must start and end at the origin city
- Analyze intermediate stops: if City B is a stop between City A and City C, visit B before C`,
              },
              {
                role: "user",
                content: `Origin: ${origin}\nDestinations to visit: ${destinations.join(", ")}\n\nTrain connections found:\n${JSON.stringify(connections, null, 2)}\n\nStation codes: ${JSON.stringify(stationMap)}\n\nDetermine the optimal city visiting order that minimizes travel and avoids backtracking.`,
              },
            ],
            tools: [routeOptTool],
            tool_choice: { type: "function", function: { name: "return_optimal_route" } },
          }),
        });

        if (!aiResp.ok) {
          const s = aiResp.status;
          if (s === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (s === 402) return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI error: ${s}`);
        }

        const aiData = await aiResp.json();
        const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
        const routeAnalysis = tc ? JSON.parse(tc.function.arguments) : { optimal_order: [origin, ...destinations, origin], segments: [], reasoning: "Fallback order" };

        result = {
          station_map: stationMap,
          connections,
          route_analysis: routeAnalysis,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("train-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
