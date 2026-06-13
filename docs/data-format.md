# Decker Phrase Data Format

A phrase item represents one idiom, phrasal verb, fixed expression, collocation, or reusable sentence pattern.

## Phrase item

```json
{
  "id": "phrase_run_into_001",
  "deckId": "deck_war_doctor_ch1",
  "phrase": "run into",
  "type": "phrv",
  "meaning": "meet someone by chance",
  "example": "I ran into an old friend at the station.",
  "pattern": "run into + person",
  "trap": "Similar to 'come across', but often used for meeting people.",
  "tags": ["daily", "B1", "War Doctor"]
}
```

## Import deck

The Import Deck view accepts one deck object with phrase items:

```json
{
  "id": "deck_war_doctor_ch1",
  "title": "War Doctor Chapter 1",
  "source": "War Doctor",
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

Supported phrase types are `idiom`, `phrv`, `fixed`, `collocation`, and `pattern`.
