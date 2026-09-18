For `clsFromShifts`, filter out `hadRecentInput` entries first, then walk what's left
once, keeping three running values: the current session's total score, when the current
session started, and the timestamp of the last entry added to it (to measure the gap for
the next one). Also track the best score seen across all sessions so far.
---
Decide whether an entry joins the current session or starts a new one *before* updating
anything: it starts a new one if the gap since the last entry in the session is over
1000ms, or if adding it would make the session's total span (from its first entry to this
one) exceed 5000ms. After deciding, update the running max with the (possibly just reset)
session's new total.
---
For `lcpCandidateResolution`, filter to candidates with `renderTime < firstInteractionAt`
first — do the interaction cutoff before comparing sizes, not after. Then reduce over
what's left: a candidate replaces the current winner if it's strictly larger, or if it
ties on size and has a strictly later `renderTime`.
---
For `attributeLongTask`, flatten every entry's `scripts` array (across all LoAF entries)
into running totals keyed by script name — a `Map<string, number>` works well, adding
each script's `duration` to whatever total is already there for that name. Once every
entry has been folded in, find the map entry with the highest total.
