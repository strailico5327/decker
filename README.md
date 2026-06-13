# Decker

Decker is a cross-device phrase memorisation web app for idioms, phrasal verbs, fixed expressions, collocations, and reusable sentence patterns.

## Project Structure

```text
frontend/
  index.html
  src/
    main.js
    styles.css
worker/
  src/
    index.js
  wrangler.toml
docs/
  api.md
  data-format.md
  schema.sql
AGENTS.md
README.md
```

## Current Milestone

The initial skeleton includes:

- A static, framework-free frontend.
- A Cloudflare Worker API skeleton.
- `GET /api/health`, `GET /api/bootstrap`, and `GET /api/decks`.
- A D1-backed `GET /api/decks` response.

Quiz logic, custom authentication, IndexedDB caching, and D1-backed write flows are not implemented yet.

## Local Development

### Frontend

The frontend is static HTML, CSS, and JavaScript. You can open `frontend/index.html` directly in a browser, but API calls to `/api/*` need a running Worker on the same origin or a local proxy.

For a quick static server:

```sh
cd frontend
python -m http.server 8000
```

Then open `http://localhost:8000`.

### Worker

Install Wrangler if needed, then run the Worker locally:

```sh
cd worker
npx wrangler dev
```

For local D1 testing, apply the schema to Wrangler's local database before calling `GET /api/decks`:

```sh
npx wrangler d1 execute decker-db --local --file ../docs/schema.sql
```

The Worker exposes:

- `GET /api/health`
- `GET /api/bootstrap`
- `GET /api/decks`

Unknown `/api/*` routes return JSON `404` responses.

## Notes

- The frontend does not contain secrets or API keys.
- The data model and database schema have not changed.
- Cloudflare D1 integration follows `docs/schema.sql`.
