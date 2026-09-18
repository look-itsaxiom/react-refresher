Store cache entries as `{ html: string; renderedAt: number }` in a
`Map<string, CacheEntry>`. "Fresh" means
`clock() - entry.renderedAt < revalidateSeconds * 1000`.

---

Keep a second `Map<string, Promise<void>>` for in-flight background
revalidations. Before starting a new one for a key, check whether that map
already has an entry for it — if so, do nothing and let the existing one
finish. Always remove the key from this map once the revalidation settles
(success or failure), in a `.finally()`, or a real failure would wedge that
key forever.

---

The stale-hit branch should *not* `await` the revalidation — it starts the
background `render` call (fire-and-forget from the caller's perspective,
but tracked in the in-flight map) and returns the old cached HTML on the
very next line. The whole point of the exercise is that `get()` resolves
fast even while `render()` is still running.

---

For a cold miss (no entry at all), you do need to `await render(key)`
before you have anything to return — there's no stale copy to fall back
to. If you want concurrent cold misses for the same key to also dedupe
(two `get()` calls landing before the first render finishes), reuse the
same in-flight map for that case too, keyed the same way.

---

`invalidate(key)` is one line: remove `key` from the cache map. Don't touch
the in-flight map — if a revalidation happens to be running when
`invalidate` is called, let it finish naturally; the next `get()` will
either find nothing cached (cold miss, blocks) or find the entry that
revalidation just wrote.
