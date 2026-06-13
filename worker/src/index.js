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

async function getDecks(env) {
  // D1 is the source of truth; this keeps the API shape frontend-friendly.
  const statement = env.DB.prepare(`
    SELECT
      decks.id,
      decks.title,
      decks.source_name AS sourceName,
      COUNT(phrases.id) AS phraseCount,
      decks.updated_at AS updatedAt
    FROM decks
    LEFT JOIN phrases ON phrases.deck_id = decks.id
    GROUP BY decks.id, decks.title, decks.source_name, decks.updated_at
    ORDER BY decks.updated_at DESC
  `);

  const { results } = await statement.all();
  return results ?? [];
}

export default {
  async fetch(request, env) {
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

      try {
        const decks = await getDecks(env);
        return jsonResponse(decks);
      } catch (error) {
        return jsonResponse({ error: "Database error" }, { status: 500 });
      }
    }

    return notFound(url.pathname);
  },
};
