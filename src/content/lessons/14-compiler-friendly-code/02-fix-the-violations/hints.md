Fix one bug at a time and re-check the preview after each. The crash from bug 3 is hiding
the other two — nothing renders at all until that one's fixed.

---

For the layout read: move the `containerRef.current` read into a `useEffect` with an empty
dependency array, store the result with `useState`, and use that state value for the
`className` instead of reading the ref directly during render.

---

For the sort: `players.toSorted((a, b) => b.score - a.score)` returns a new sorted array
without touching `players`. Render from that copy, not from `players` itself.

---

For the id: `data-id={player.name}` works here because names are unique in this dataset —
the point is just that it doesn't change between renders. Delete the `Math.random()` line
entirely.
