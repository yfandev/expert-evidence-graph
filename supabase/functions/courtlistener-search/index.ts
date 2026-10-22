const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequestBody {
  query: string;
  type?: string;
  court?: string;
  jurisdiction?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: SearchRequestBody = await req.json();
    const query = body.query?.trim();
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiUrl = Deno.env.get("COURTLISTENER_API_URL") || "https://www.courtlistener.com/api/rest/v4/search/";
    const apiToken = Deno.env.get("COURTLISTENER_API_TOKEN");

    const params = new URLSearchParams();
    params.set("q", query);
    params.set("type", body.type || "o");
    params.set("order_by", "score desc");
    params.set("stat_Published", "on");

    if (body.court) {
      params.set("court", body.court);
    }

    const requestUrl = `${apiUrl}?${params.toString()}`;

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (apiToken) {
      headers["Authorization"] = `Token ${apiToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(requestUrl, { headers, signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          error: fetchErr instanceof Error && fetchErr.name === "AbortError"
            ? "CourtListener API timed out"
            : `Network error contacting CourtListener: ${fetchErr instanceof Error ? fetchErr.message : "unknown"}`,
          authenticated: !!apiToken,
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `CourtListener API returned ${response.status}`,
          details: errorText.slice(0, 500),
          authenticated: !!apiToken,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const results = (data.results || []).slice(0, 20);

    return new Response(
      JSON.stringify({
        count: data.count || results.length,
        results,
        authenticated: !!apiToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
