For `transition`, a lookup table is simpler and less bug-prone than a chain
of `if`s: key it by `` `${state}:${event}` `` mapping to `{ state, uiAction }`,
and if the key isn't in the table, `throw new Error(...)`. Copy the table
from the prompt directly — there are exactly 8 valid entries.

---

Still on `transition`: don't special-case "the second `new-version-found`"
separately from the first one. Both `waiting + new-version-found` and
`active + new-version-found` map to the same result
(`{ state: 'waiting', uiAction: 'show-update-toast' }`) — it's the same row
whether a worker was already waiting or not, which is exactly what makes a
repeated `new-version-found` a no-op on the state label while still
re-firing the toast.

---

For `revisionDiff`, build two `Map<string, Entry>` keyed by `url` first —
one per manifest — so lookups are O(1) instead of re-scanning arrays. Loop
over the new manifest's entries: no match in the old map → `add`; a match
where the URL is hashed → `keep` regardless of `revision`; a match where
`revision` is equal → `keep`; otherwise → `add`. Then a second loop over the
*old* manifest's entries, pushing to `remove` any whose `url` isn't a key in
the new map.

---

The hash-detection regex from the prompt, verbatim, works directly against
the full URL string: `/[.-][a-f0-9]{8,}\./i.test(url)`. Test it against
`/assets/main.a1b2c3d4.js` (true) and `/index.html` (false) before wiring it
in, so you're confident it's not over- or under-matching.
