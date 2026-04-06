const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOCATIONIQ_BASE = "https://us1.locationiq.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOCATIONIQ_API_KEY = Deno.env.get("LOCATIONIQ_API_KEY");
  if (!LOCATIONIQ_API_KEY) {
    return new Response(JSON.stringify({ error: "LOCATIONIQ_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, type } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'query' string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "directions") {
      // Directions API proxy
      const { coordinates } = await req.json().catch(() => ({ coordinates: null }));
      // For now, forward geocoding only
    }

    // Forward geocoding
    const url = `${LOCATIONIQ_BASE}/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&normalizeaddress=1`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`LocationIQ error [${res.status}]: ${text}`);
      return new Response(JSON.stringify({ results: [], error: `LocationIQ API error: ${res.status}` }), {
        status: 200, // Return 200 so client can fallback gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await res.json();

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Geocode function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
