# Decker API Design

All API routes live under `/api/*`.

The frontend must not access the database directly. It talks to the Cloudflare Worker API, and the Worker reads/writes Cloudflare D1.

## Basic idea

Frontend:

```text
Please give me my decks.
```

API request:

```text
GET /api/decks
```

Backend:

```text
Read decks from D1 and return JSON.
```

## GET /api/health

Checks whether the backend is alive.

Response:

```json
{
  "ok": true
}
```

## GET /api/bootstrap

Loads basic app information when the app opens.

Response:

```json
{
  "serverTime": "2026-06-13T12:00:00Z"
}
```

## GET /api/decks

Returns all decks.

Response:

```json
[
  {
    "id": "deck_war_doctor_ch1",
    "title": "War Doctor Ch.1",
    "sourceName": "War Doctor",
    "phraseCount": 32,
    "updatedAt": "2026-06-13T12:00:00Z"
  }
]
```

## POST /api/decks

Creates a new deck.

Request:

```json
{
  "title": "War Doctor Ch.1",
  "sourceName": "War Doctor"
}
```

Response:

```json
{
  "id": "deck_war_doctor_ch1",
  "title": "War Doctor Ch.1",
  "sourceName": "War Doctor",
  "createdAt": "2026-06-13T12:00:00Z",
  "updatedAt": "2026-06-13T12:00:00Z"
}
```

## GET /api/decks/:id

Returns one deck with its phrases.

Response:

```json
{
  "id": "deck_sample",
  "title": "Sample Deck",
  "sourceName": "Demo",
  "createdAt": "2026-06-13T00:00:00Z",
  "updatedAt": "2026-06-13T00:00:00Z",
  "phrases": [
    {
      "id": "phrase_run_into_001",
      "phrase": "run into",
      "type": "phrv",
      "meaning": "meet someone by chance",
      "example": "I ran into an old friend at the station.",
      "pattern": "run into + person",
      "trap": "Similar to come across, but often used for meeting people.",
      "tags": ["daily", "B1"]
    }
  ]
}
```

If the deck does not exist:

```json
{
  "error": "Deck not found"
}
```

## POST /api/decks/:id/phrases

Adds phrases to a deck.

Request:

```json
{
  "phrases": [
    {
      "phrase": "run into",
      "type": "phrv",
      "meaning": "meet someone by chance",
      "example": "I ran into an old friend at the station.",
      "pattern": "run into + person",
      "trap": "Similar to 'come across', but often used for meeting people.",
      "tags": ["daily", "B1"]
    }
  ]
}
```

## GET /api/review

Returns phrases for review.

Optional query parameters:

```text
deckId
limit
type
```

Example:

```text
/api/review?deckId=deck_war_doctor_ch1&limit=10
```

Response:

```json
{
  "items": [
    {
      "id": "phrase_run_into_001",
      "deckId": "deck_war_doctor_ch1",
      "phrase": "run into",
      "type": "phrv",
      "meaning": "meet someone by chance",
      "example": "I ran into an old friend at the station.",
      "pattern": "run into + person",
      "trap": "Similar to come across, but often used for meeting people.",
      "tags": ["daily", "B1"]
    }
  ]
}
```

## POST /api/attempts

Saves one answer attempt and updates phrase progress.

Request:

```json
{
  "phraseId": "phrase_run_into_001",
  "questionType": "gap-fill",
  "selectedAnswer": "ran into",
  "correct": true,
  "rating": "hesitated",
  "deviceId": "ipad"
}
```

Response:

```json
{
  "saved": true,
  "newStatus": "learning",
  "mastery": 1
}
```

## GET /api/weak

Returns weak phrases.

## GET /api/sync

Returns changed records since a timestamp.

Example:

```text
/api/sync?since=2026-06-13T12:00:00Z
```

Response:

```json
{
  "serverTime": "2026-06-13T13:00:00Z",
  "decks": [],
  "phrases": [],
  "progress": [],
  "deleted": []
}
```

## API rules

* Use JSON for all request and response bodies.
* Use prepared statements for all D1 queries.
* Validate all request bodies in the Worker.
* Attempts are append-only.
* Phrase progress is updated by the backend after every attempt.
* The frontend must not contain secrets.
