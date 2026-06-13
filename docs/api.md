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

Creates or updates a deck.

Request:

```json
{
  "id": "deck_war_doctor_ch1",
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

Adds or updates phrases in a deck.

Request:

```json
{
  "phrases": [
    {
      "id": "phrase_run_into_001",
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

Response:

```json
{
  "saved": true,
  "deckId": "deck_war_doctor_ch1",
  "phraseCount": 1
}
```

Invalid import requests return JSON errors:

```json
{
  "error": "title is required"
}
```

## POST /api/attempts

Saves one answer attempt and updates phrase progress.

Request:

```json
{
  "phraseId": "phrase_run_into_001",
  "deckId": "deck_sample",
  "questionType": "meaning-choice",
  "selectedAnswer": "meet someone by chance",
  "correctAnswer": "meet someone by chance",
  "correct": true
}
```

The Worker records the attempt using the existing `attempts` table fields and updates `phrase_progress`. `deckId` and `correctAnswer` are accepted from the frontend for request context, but they are not stored as separate attempt columns in the current schema.

Response:

```json
{
  "saved": true,
  "correct": true,
  "newStatus": "learning",
  "mastery": 1
}
```

## GET /api/weak

Returns weak phrases.

Weak phrases are phrases with progress rows where `wrong_count > 0`, `status = "learning"`, or low mastery.

Response:

```json
{
  "items": [
    {
      "id": "phrase_run_into_001",
      "deckId": "deck_sample",
      "phrase": "run into",
      "type": "phrv",
      "meaning": "meet someone by chance",
      "example": "I ran into an old friend at the station.",
      "pattern": "run into + person",
      "trap": "Similar to come across, but often used for meeting people.",
      "tags": ["daily", "B1"],
      "progress": {
        "attempts": 3,
        "correctCount": 1,
        "wrongCount": 2,
        "hesitatedCount": 0,
        "mastery": 0,
        "status": "learning",
        "lastReviewedAt": "2026-06-13T12:00:00Z"
      }
    }
  ]
}
```

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
