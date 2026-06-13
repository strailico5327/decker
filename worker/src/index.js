const corsHeaders = {
  "access-control-allow-origin": "http://localhost:5173",
  "access-control-allow-methods": "GET, POST, OPTIONS",
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

function parseTags(tagsJson) {
  if (!tagsJson) {
    return [];
  }

  try {
    const tags = JSON.parse(tagsJson);
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    return [];
  }
}

async function getDeckDetail(env, deckId) {
  const deck = await env.DB.prepare(`
    SELECT
      id,
      title,
      source_name AS sourceName,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM decks
    WHERE id = ?
  `)
    .bind(deckId)
    .first();

  if (!deck) {
    return null;
  }

  const { results } = await env.DB.prepare(`
    SELECT
      id,
      phrase,
      type,
      meaning,
      example,
      pattern,
      trap,
      tags_json AS tagsJson
    FROM phrases
    WHERE deck_id = ?
    ORDER BY created_at ASC, phrase ASC
  `)
    .bind(deckId)
    .all();

  const phrases = (results ?? []).map((phrase) => ({
    id: phrase.id,
    phrase: phrase.phrase,
    type: phrase.type,
    meaning: phrase.meaning,
    example: phrase.example,
    pattern: phrase.pattern,
    trap: phrase.trap,
    tags: parseTags(phrase.tagsJson),
  }));

  return {
    ...deck,
    phrases,
  };
}

function mapPhraseRow(row) {
  return {
    id: row.id,
    deckId: row.deckId,
    phrase: row.phrase,
    type: row.type,
    meaning: row.meaning,
    example: row.example,
    pattern: row.pattern,
    trap: row.trap,
    tags: parseTags(row.tagsJson),
  };
}

function mapWeakPhraseRow(row) {
  return {
    ...mapPhraseRow(row),
    progress: {
      attempts: row.attempts,
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      hesitatedCount: row.hesitatedCount,
      mastery: row.mastery,
      status: row.status,
      lastReviewedAt: row.lastReviewedAt,
    },
  };
}

function parseLimit(value) {
  const limit = Number.parseInt(value, 10);

  if (!Number.isInteger(limit) || limit < 1) {
    return null;
  }

  return Math.min(limit, 50);
}

function badRequest(message) {
  return jsonResponse({ error: message }, { status: 400 });
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

function validateAttemptBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body must be JSON";
  }

  if (typeof body.phraseId !== "string" || body.phraseId.trim() === "") {
    return "phraseId is required";
  }

  if (typeof body.deckId !== "string" || body.deckId.trim() === "") {
    return "deckId is required";
  }

  if (typeof body.selectedAnswer !== "string") {
    return "selectedAnswer is required";
  }

  if (typeof body.correctAnswer !== "string") {
    return "correctAnswer is required";
  }

  if (typeof body.correct !== "boolean") {
    return "correct is required";
  }

  return null;
}

function isSupportedPhraseType(type) {
  return ["idiom", "phrv", "fixed", "collocation", "pattern"].includes(type);
}

function validateDeckBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body must be JSON";
  }

  if (typeof body.id !== "string" || body.id.trim() === "") {
    return "id is required";
  }

  if (typeof body.title !== "string" || body.title.trim() === "") {
    return "title is required";
  }

  if (body.sourceName !== undefined && typeof body.sourceName !== "string") {
    return "sourceName must be a string";
  }

  return null;
}

function validatePhraseInput(phrase, index) {
  if (!phrase || typeof phrase !== "object") {
    return `phrases[${index}] must be an object`;
  }

  if (typeof phrase.id !== "string" || phrase.id.trim() === "") {
    return `phrases[${index}].id is required`;
  }

  if (typeof phrase.phrase !== "string" || phrase.phrase.trim() === "") {
    return `phrases[${index}].phrase is required`;
  }

  if (typeof phrase.type !== "string" || !isSupportedPhraseType(phrase.type)) {
    return `phrases[${index}].type must be one of idiom, phrv, fixed, collocation, pattern`;
  }

  if (typeof phrase.meaning !== "string" || phrase.meaning.trim() === "") {
    return `phrases[${index}].meaning is required`;
  }

  for (const field of ["example", "pattern", "trap"]) {
    if (phrase[field] !== undefined && phrase[field] !== null && typeof phrase[field] !== "string") {
      return `phrases[${index}].${field} must be a string`;
    }
  }

  if (phrase.tags !== undefined && !Array.isArray(phrase.tags)) {
    return `phrases[${index}].tags must be an array`;
  }

  if (Array.isArray(phrase.tags) && phrase.tags.some((tag) => typeof tag !== "string")) {
    return `phrases[${index}].tags must contain only strings`;
  }

  return null;
}

function validatePhrasesBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body must be JSON";
  }

  if (!Array.isArray(body.phrases)) {
    return "phrases must be an array";
  }

  for (let index = 0; index < body.phrases.length; index += 1) {
    const error = validatePhraseInput(body.phrases[index], index);

    if (error) {
      return error;
    }
  }

  return null;
}

async function getReviewItems(env, { deckId, limit }) {
  const selectFields = `
    SELECT
      id,
      deck_id AS deckId,
      phrase,
      type,
      meaning,
      example,
      pattern,
      trap,
      tags_json AS tagsJson
    FROM phrases
  `;

  let statement;

  if (deckId && limit) {
    statement = env.DB.prepare(`${selectFields} WHERE deck_id = ? ORDER BY created_at ASC, phrase ASC LIMIT ?`).bind(deckId, limit);
  } else if (deckId) {
    statement = env.DB.prepare(`${selectFields} WHERE deck_id = ? ORDER BY created_at ASC, phrase ASC`).bind(deckId);
  } else if (limit) {
    statement = env.DB.prepare(`${selectFields} ORDER BY created_at ASC, phrase ASC LIMIT ?`).bind(limit);
  } else {
    statement = env.DB.prepare(`${selectFields} ORDER BY created_at ASC, phrase ASC`);
  }

  const { results } = await statement.all();
  return (results ?? []).map(mapPhraseRow);
}

async function saveDeck(env, body) {
  const now = new Date().toISOString();
  const sourceName = typeof body.sourceName === "string" ? body.sourceName : "";

  await env.DB.prepare(`
    INSERT INTO decks (
      id,
      title,
      source_name,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      source_name = excluded.source_name,
      updated_at = excluded.updated_at
  `)
    .bind(body.id, body.title, sourceName, now, now)
    .run();

  return {
    id: body.id,
    title: body.title,
    sourceName,
    createdAt: now,
    updatedAt: now,
  };
}

async function savePhrases(env, deckId, phrases) {
  const deck = await env.DB.prepare(`
    SELECT id
    FROM decks
    WHERE id = ?
  `)
    .bind(deckId)
    .first();

  if (!deck) {
    return null;
  }

  const now = new Date().toISOString();
  const statements = phrases.map((phrase) => {
    const tagsJson = JSON.stringify(phrase.tags ?? []);
    return env.DB.prepare(`
      INSERT INTO phrases (
        id,
        deck_id,
        phrase,
        type,
        meaning,
        example,
        pattern,
        trap,
        tags_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        deck_id = excluded.deck_id,
        phrase = excluded.phrase,
        type = excluded.type,
        meaning = excluded.meaning,
        example = excluded.example,
        pattern = excluded.pattern,
        trap = excluded.trap,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at
    `).bind(
      phrase.id,
      deckId,
      phrase.phrase,
      phrase.type,
      phrase.meaning,
      phrase.example ?? null,
      phrase.pattern ?? null,
      phrase.trap ?? null,
      tagsJson,
      now,
      now,
    );
  });

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  await env.DB.prepare(`
    UPDATE decks
    SET updated_at = ?
    WHERE id = ?
  `)
    .bind(now, deckId)
    .run();

  return {
    saved: true,
    deckId,
    phraseCount: phrases.length,
  };
}

async function saveAttempt(env, body) {
  const now = new Date().toISOString();
  const phrase = await env.DB.prepare(`
    SELECT
      id,
      deck_id AS deckId,
      meaning
    FROM phrases
    WHERE id = ?
  `)
    .bind(body.phraseId)
    .first();

  if (!phrase || phrase.deckId !== body.deckId) {
    return null;
  }

  const correct = body.selectedAnswer === phrase.meaning;
  const correctValue = correct ? 1 : 0;
  const wrongValue = correct ? 0 : 1;
  const rating = typeof body.rating === "string" && body.rating.trim() !== "" ? body.rating : null;
  const hesitatedValue = rating === "hesitated" ? 1 : 0;
  const questionType = typeof body.questionType === "string" && body.questionType.trim() !== "" ? body.questionType : "meaning-choice";
  const deviceId = typeof body.deviceId === "string" && body.deviceId.trim() !== "" ? body.deviceId : null;

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO attempts (
        id,
        phrase_id,
        question_type,
        selected_answer,
        correct,
        rating,
        answered_at,
        device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), body.phraseId, questionType, body.selectedAnswer, correctValue, rating, now, deviceId),
    env.DB.prepare(`
      INSERT INTO phrase_progress (
        phrase_id,
        attempts,
        correct_count,
        wrong_count,
        hesitated_count,
        mastery,
        status,
        last_reviewed_at,
        updated_at
      )
      VALUES (?, 1, ?, ?, ?, ?, 'learning', ?, ?)
      ON CONFLICT(phrase_id) DO UPDATE SET
        attempts = attempts + 1,
        correct_count = correct_count + ?,
        wrong_count = wrong_count + ?,
        hesitated_count = hesitated_count + ?,
        mastery = CASE
          WHEN ? = 1 THEN MIN(mastery + 1, 5)
          ELSE MAX(mastery - 1, 0)
        END,
        status = CASE
          WHEN ? = 1 AND MIN(mastery + 1, 5) >= 5 THEN 'known'
          ELSE 'learning'
        END,
        last_reviewed_at = ?,
        updated_at = ?
    `).bind(
      body.phraseId,
      correctValue,
      wrongValue,
      hesitatedValue,
      correctValue,
      now,
      now,
      correctValue,
      wrongValue,
      hesitatedValue,
      correctValue,
      correctValue,
      now,
      now,
    ),
  ]);

  const progress = await env.DB.prepare(`
    SELECT
      status,
      mastery
    FROM phrase_progress
    WHERE phrase_id = ?
  `)
    .bind(body.phraseId)
    .first();

  return {
    saved: true,
    correct,
    newStatus: progress?.status ?? "learning",
    mastery: progress?.mastery ?? 0,
  };
}

async function getWeakItems(env) {
  const { results } = await env.DB.prepare(`
    SELECT
      phrases.id,
      phrases.deck_id AS deckId,
      phrases.phrase,
      phrases.type,
      phrases.meaning,
      phrases.example,
      phrases.pattern,
      phrases.trap,
      phrases.tags_json AS tagsJson,
      phrase_progress.attempts,
      phrase_progress.correct_count AS correctCount,
      phrase_progress.wrong_count AS wrongCount,
      phrase_progress.hesitated_count AS hesitatedCount,
      phrase_progress.mastery,
      phrase_progress.status,
      phrase_progress.last_reviewed_at AS lastReviewedAt
    FROM phrases
    INNER JOIN phrase_progress ON phrase_progress.phrase_id = phrases.id
    WHERE
      phrase_progress.wrong_count > 0
      OR phrase_progress.status = 'learning'
      OR phrase_progress.mastery <= 2
    ORDER BY
      phrase_progress.mastery ASC,
      phrase_progress.wrong_count DESC,
      phrase_progress.last_reviewed_at DESC
  `).all();

  return (results ?? []).map(mapWeakPhraseRow);
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
      if (request.method === "POST") {
        const body = await readJsonBody(request);
        const validationError = validateDeckBody(body);

        if (validationError) {
          return badRequest(validationError);
        }

        try {
          const deck = await saveDeck(env, body);
          return jsonResponse(deck);
        } catch (error) {
          return jsonResponse({ error: "Database error" }, { status: 500 });
        }
      }

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

    const deckPhrasesMatch = url.pathname.match(/^\/api\/decks\/([^/]+)\/phrases$/);
    if (deckPhrasesMatch) {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      const body = await readJsonBody(request);
      const validationError = validatePhrasesBody(body);

      if (validationError) {
        return badRequest(validationError);
      }

      try {
        const deckId = decodeURIComponent(deckPhrasesMatch[1]);
        const result = await savePhrases(env, deckId, body.phrases);

        if (!result) {
          return jsonResponse({ error: "Deck not found" }, { status: 404 });
        }

        return jsonResponse(result);
      } catch (error) {
        return jsonResponse({ error: "Database error" }, { status: 500 });
      }
    }

    if (url.pathname === "/api/review") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      try {
        const deckId = url.searchParams.get("deckId");
        const limit = parseLimit(url.searchParams.get("limit"));
        const items = await getReviewItems(env, { deckId, limit });
        return jsonResponse({ items });
      } catch (error) {
        return jsonResponse({ error: "Database error" }, { status: 500 });
      }
    }

    if (url.pathname === "/api/attempts") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      const body = await readJsonBody(request);
      const validationError = validateAttemptBody(body);

      if (validationError) {
        return badRequest(validationError);
      }

      try {
        const result = await saveAttempt(env, body);

        if (!result) {
          return badRequest("Phrase not found for deck");
        }

        return jsonResponse(result);
      } catch (error) {
        return jsonResponse({ error: "Database error" }, { status: 500 });
      }
    }

    if (url.pathname === "/api/weak") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      try {
        const items = await getWeakItems(env);
        return jsonResponse({ items });
      } catch (error) {
        return jsonResponse({ error: "Database error" }, { status: 500 });
      }
    }

    const deckDetailMatch = url.pathname.match(/^\/api\/decks\/([^/]+)$/);
    if (deckDetailMatch) {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }

      try {
        const deckId = decodeURIComponent(deckDetailMatch[1]);
        const deck = await getDeckDetail(env, deckId);

        if (!deck) {
          return jsonResponse({ error: "Deck not found" }, { status: 404 });
        }

        return jsonResponse(deck);
      } catch (error) {
        return jsonResponse({ error: "Database error" }, { status: 500 });
      }
    }

    return notFound(url.pathname);
  },
};
