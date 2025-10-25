## Flashcard Scheduling Logic (First Draft)

### Overview
This app uses a lightweight SM‑2–style spaced repetition. Each card keeps a small progress record and is scheduled earlier or later based on your feedback: Again, Hard, Good, or Easy.

### Per‑card progress fields
- **ease**: how quickly the interval grows (range: 1.3–3.0; default 2.5)
- **intervalMs**: current interval in milliseconds
- **repetitions**: number of successful reviews in a row (resets on “Again”)
- **dueAtMs**: epoch time when the card next becomes due
- **lapses**: number of times you failed the card

Initial state for any unseen card:
- ease = 2.5, intervalMs = 0, repetitions = 0, dueAtMs = 0, lapses = 0

### Grading rules
- **Again**:
  - ease -= 0.2 (clamped to ≥ 1.3)
  - interval = 10 seconds
  - repetitions = 0
  - lapses += 1
- **Hard**:
  - ease -= 0.15 (clamped to ≥ 1.3)
  - interval = max(60 seconds, round((interval || 30 seconds) × 1.2))
- **Good**:
  - if repetitions == 0 → interval = 5 minutes
  - else → interval = round(max(2 minutes, (interval || 1 minute) × ease))
  - repetitions += 1
- **Easy**:
  - ease += 0.05 (clamped to ≤ 3.0)
  - if repetitions == 0 → interval = 10 minutes
  - else → interval = round(max(5 minutes, (interval || 1 minute) × ease × 1.3))
  - repetitions += 1

After applying the rule, set:
- dueAtMs = nowMs + intervalMs

Ease is always clamped to the range [1.3, 3.0].

### Pseudocode
```text
function schedule(prev, quality, nowMs):
  ease = clamp(prev.ease, 1.3, 3.0)
  interval = prev.intervalMs
  reps = prev.repetitions
  lapses = prev.lapses

  switch quality:
    case Again:
      ease = clamp(ease - 0.2, 1.3, 3.0)
      interval = 10s
      reps = 0
      lapses += 1
    case Hard:
      ease = clamp(ease - 0.15, 1.3, 3.0)
      interval = max(60s, round((interval or 30s) * 1.2))
    case Good:
      if reps == 0:
        interval = 5m
      else:
        interval = round(max(2m, (interval or 1m) * ease))
      reps = max(1, reps + 1)
    case Easy:
      ease = clamp(ease + 0.05, 1.3, 3.0)
      if reps == 0:
        interval = 10m
      else:
        interval = round(max(5m, (interval or 1m) * ease * 1.3))
      reps = max(1, reps + 1)

  return {
    ease,
    intervalMs: interval,
    repetitions: reps,
    dueAtMs: nowMs + interval,
    lapses,
  }
```

### Card selection
1. For each card, compute `dueAtMs` (default 0 if no stored progress).
2. Sort by `dueAtMs` ascending.
3. Prefer cards with `dueAtMs ≤ now` (due cards). If none are due and “Study ahead” is enabled, show the earliest future card.
4. Show counters: number of due cards and total deck size. Display time until next card if all remaining are in the future.

### Settings and persistence
- Progress is stored in `localStorage` under `flashcards:voc_1:progress`.
- Settings (currently: prompt side `korean` or `english`) are stored under `flashcards:settings`.
- Reset clears only the progress map.

### Notes
- Intervals are intentionally conservative for a first draft; they can be tuned.
- Adding a short “learning” ladder (e.g., 10s → 1m → 5m) before graduating to spaced intervals can improve initial retention.
- Deck used for testing is `public/voc_1.json`.


