The concept steps described three of the fussier real-world algorithms behind Core Web
Vitals: CLS session windows, LCP candidate resolution, and Long Animation Frame script
attribution. This exercise implements all three as pure functions over
`PerformanceEntry`-shaped fixture data (jsdom has no real `PerformanceObserver` data, so
these take plain arrays that mirror what the real entries look like).

## 1. `clsFromShifts(shifts)`

`shifts` is an array of `{ startTime: number; value: number; hadRecentInput: boolean }`,
already in chronological order. Implement the session-window algorithm from the concept
step:

- Ignore any entry with `hadRecentInput: true` entirely — it never starts or extends a
  session.
- Walk the remaining entries in order, grouping them into sessions. An entry starts a
  **new** session (instead of joining the current one) when either:
  - the gap since the previous entry in the session exceeds 1000ms, or
  - adding it to the current session would make that session span more than 5000ms
    from its first entry.
- Each session's score is the sum of its entries' `value`s. Return the score of the
  session with the **highest** total — not the sum across all sessions.

## 2. `lcpCandidateResolution(entries, firstInteractionAt)`

`entries` is an array of LCP candidates, `{ size: number; renderTime: number }`, in the
order they were discovered. `firstInteractionAt` is a timestamp. Implement:

- Only consider candidates whose `renderTime` is strictly before `firstInteractionAt` —
  LCP stops updating once the user interacts.
- Among those, the winner is the one with the largest `size`.
- If two or more candidates tie on `size`, the one with the **later** `renderTime` wins
  — the spec always reports the latest candidate that reached that size, not the first.
- Return the winning candidate's `renderTime` (the final LCP value). If nothing qualifies,
  return `0`.

## 3. `attributeLongTask(loafEntries)`

`loafEntries` is an array of Long Animation Frame entries, each
`{ scripts: Array<{ name: string; duration: number }> }`. A single frame can list several
scripts; the same script name can also reappear across multiple frames. Sum each script's
duration across every frame and every appearance, and return the name of the script with
the highest total. Return `null` for an empty input (or an input with no scripts at all).

None of these three touch the DOM. `App` renders their output against a small fixture —
you shouldn't need to change it.
