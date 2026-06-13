# Decker Development Rules

Decker is a cross-device phrase memorisation web app for idioms, phrasal verbs, fixed expressions, collocations, and reusable sentence patterns.

## Architecture

* The frontend is a static web app intended for GitHub Pages.
* The backend is a Cloudflare Worker.
* Cloudflare D1 is the source of truth.
* Browser IndexedDB may be used as a local cache.
* The frontend must not contain secrets, private tokens, database credentials, or API keys.

## Project structure

```text
frontend/
worker/
docs/
AGENTS.md
README.md
```

## Documentation

Before changing core behaviour, check these files:

* `docs/data-format.md`
* `docs/schema.sql`
* `docs/api.md`

If the data model, database schema, or API routes change, update the matching documentation file.

## Backend rules

* API routes live under `/api/*`.
* Use Cloudflare D1 for decks, phrases, attempts, and phrase progress.
* Use prepared statements for all SQL queries.
* Never build SQL queries by string concatenation with user input.
* Validate all request bodies in the Worker.
* Attempts are append-only.
* Phrase progress is updated server-side after each attempt.
* Do not implement custom authentication unless explicitly requested.
* Assume Cloudflare Access may protect the app and API.

## Frontend rules

* Keep the UI mobile-first.
* Keep the app simple and readable.
* Do not add React, Vue, Svelte, or another frontend framework unless explicitly requested.
* Do not add a build system unless explicitly requested.
* The frontend should call the backend API with `fetch()`.
* Use IndexedDB only as local cache or offline support, not as the source of truth.

## Data rules

* Follow `docs/data-format.md`.
* Supported phrase types are:

  * `idiom`
  * `phrv`
  * `fixed`
  * `collocation`
  * `pattern`

## First milestone

The first working milestone should be:

1. Open the frontend.
2. Call `/api/health`.
3. Show whether the backend is reachable.
4. Call `/api/decks`.
5. Show a basic deck list.
6. No quiz logic yet.
