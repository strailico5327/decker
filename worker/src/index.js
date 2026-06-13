const corsHeaders = {
  "access-control-allow-origin": "http://localhost:5173",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
};

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  // Allow the local frontend dev server to call this Worker.
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function notFound(pathname) {
  return jsonResponse(
    {
      error: "Not found",
      path: pathname,
    },
    { status: 404 },
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (!url.pathname.startsWith("/api/")) {
      return notFound(url.pathname);
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/api/bootstrap") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      return jsonResponse({ serverTime: new Date().toISOString() });
    }

    if (url.pathname === "/api/decks") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      const now = new Date().toISOString();
      return jsonResponse([
        {
          id: "deck_sample",
          title: "Sample Deck",
          sourceName: "Demo",
          phraseCount: 3,
          updatedAt: now,
        },
      ]);
    }

    return notFound(url.pathname);
  },
};
