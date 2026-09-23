# Big lists, big data, and leaks

Long tasks aren't the only way runtime performance degrades. Rendering (and re-rendering)
a lot of DOM, doing avoidable O(n) work on every keystroke, and holding onto memory you no
longer need all show up as janky scrolling, slow typing, and a tab that gets slower the
longer it's open — none of which is a single long task you can point a profiler at and fix
in one place.

## Virtualization: render the window, not the list

A list of 10,000 rows doesn't need 10,000 DOM nodes — it needs however many fit in the
viewport, plus a small buffer. **Virtualization** (also called windowing) keeps the
scroll container's total height correct (so the scrollbar and scroll-jump-to-position
behave normally) while only mounting the rows currently visible, repositioning them with
`transform: translateY()` or absolute `top` as the user scrolls.

The core math, for fixed-height rows:

```
firstVisible = floor(scrollTop / rowHeight)
lastVisible  = floor((scrollTop + viewportHeight) / rowHeight)
```

Add **overscan** — a few extra rows rendered just outside the visible range on each side —
so a fast scroll or a screen reader's focus move doesn't flash empty space for one frame
while new rows mount. Overscan trades a bit of extra DOM for smoother scrolling; too much
of it defeats the point of virtualizing at all.

**Variable-height rows** break the fixed-height formula, because you can't know a row's
position without knowing every row before it's height. The usual fix is to maintain a
prefix-sum array of measured heights (or estimate unmeasured rows and correct once they're
measured, which is what most libraries do), turning "where does row N start" into a lookup
instead of a per-scroll recomputation. **Scroll anchoring** — keeping the same content
under the user's eye when heights above it change (a row above resizes after its image
loads, say) — needs to adjust `scrollTop` by the delta whenever a measured height turns
out to differ from its estimate, or the whole list visibly jumps.

Virtualization has real accessibility costs to manage: a screen reader's virtual cursor
doesn't know rows exist until they mount, so tabbing or arrow-keying past the rendered
window doesn't move to "the next item" the way it would in a fully-rendered list. Libraries
that handle this well render `role="grid"`/`role="listbox"` semantics with `aria-rowindex`
or `aria-posinset`/`aria-setsize` on each mounted row so assistive tech can announce
position within the full set, not just within what's mounted, and they keep focus movement
driving the window (jumping to row 500 scrolls it into view and mounts it) rather than
letting focus try to land on a node that doesn't exist yet.

**Building it yourself vs. reaching for a library:** the windowing math above is worth
knowing (it's this lesson's exercise), but production lists are rarely worth
hand-rolling — variable heights, horizontal + vertical grids, sticky headers, and the
accessibility work above are all solved problems. As of September 2026, **TanStack
Virtual** (`@tanstack/react-virtual` and framework-agnostic core) is the most broadly
recommended choice for new code — headless, actively maintained, and the natural extension
if you already use TanStack Query or Table. **react-window** is still a reasonable choice
in an existing codebase that already depends on it, but `react-virtuoso` has overtaken it
in adoption for new projects that want more built-in behavior (variable heights, grouping)
out of the box. All three solve the same core windowing problem; the choice is about API
shape and how much you want the library to decide for you.

## Pagination vs. infinite scroll

Both exist to avoid rendering (or fetching) everything at once, but they trade off
differently. **Pagination** gives the user a stable, bookmarkable position ("page 4") and
caps memory use per page, but interrupts the scroll and adds a click per page.
**Infinite scroll** keeps the user in the scroll flow but needs virtualization once enough
pages have loaded to keep the DOM bounded — an infinite-scroll list that never unmounts
old pages just becomes a slow, ever-growing DOM with extra steps. A common production
pattern combines them: fetch in pages (so the network and server-side query stay bounded
and cursor-paginated), but render the accumulated results through a virtualizer (so the
DOM stays bounded regardless of how many pages have loaded).

## Avoiding O(n) work per keystroke

A search box that filters an array with `.filter()` on every keystroke is fine at 200 items
and a visible stutter at 50,000. The fix is rarely "make the filter faster" — it's doing
less total work per keystroke:

- **Build an index once, query it repeatedly.** A `Map` keyed by the field you search, or a
  precomputed lowercase copy of the searchable text, turns a per-keystroke linear scan with
  string normalization into a per-keystroke linear scan without it — still O(n), but with a
  much smaller constant. For real substring/fuzzy search at scale, a trigram index or a
  dedicated library (Fuse.js, MiniSearch) avoids the O(n) scan entirely for most queries.
- **Memoize derived data, not just components.** If a keystroke changes `query` but not
  `rawItems`, recomputing a derived, sorted, or grouped-by structure from `rawItems` on
  every render (even when `rawItems` hasn't changed) is wasted work; deriving it once and
  reusing it until its actual inputs change is a data-shape problem, not a
  memoization-API problem — `useMemo` (or moving the derivation outside the component
  entirely) is the mechanism, but knowing which inputs actually invalidate the result is
  the part that matters.
- **Debounce the expensive part, not the input.** The text field should update on every
  keystroke (that's a cheap DOM write); the expensive search/filter/network call should run
  on a delay after typing pauses. Conflating the two — debouncing the input's own value —
  makes typing itself feel laggy, which is the opposite of the goal.

## Moving heavy work off the thread

Everything above still runs on the main thread, cooperatively yielding at best.
[Lesson 29](/) covered the actual escape hatch: a Web Worker runs on its own thread with no
DOM access, communicating by `postMessage` (structured-cloned, or transferred for large
buffers). For a synchronous computation heavy enough that chunking-with-yields still adds
up to a noticeably slow interaction — sorting/filtering hundreds of thousands of rows,
parsing a large payload, image or audio processing — a worker removes the work from the
main thread's budget entirely instead of interleaving it more politely.

## Memory leaks and GC pressure

A **memory leak** in a long-lived single-page app is anything that keeps a reference to an
object alive after nothing should still need it, so the garbage collector can never reclaim
it. The usual culprits:

- **Listeners and timers never cleaned up.** An `addEventListener` or `setInterval` started
  in a `useEffect` without a matching cleanup keeps running (and keeps its closure alive)
  after the component unmounts. This is the single most common React memory leak and the
  reason `useEffect`'s cleanup function exists.
- **Detached DOM nodes.** If JS code (a closure, a `Map`, a module-level cache) still holds
  a reference to a DOM node after React has removed it from the tree, the node is
  "detached" — invisible and inert, but not collectible, and Chrome DevTools' memory
  profiler has a dedicated filter for finding exactly these.
- **Closures over large data.** A callback captured once (an event handler, a memoized
  function) that closes over a large object it no longer needs keeps that whole object
  alive for as long as the callback reference survives, even if only one small field is
  ever read from it.
- **Module-level caches with no eviction.** A `Map` used as a cache that only ever grows
  (never evicts by size or time) is a slow leak by design — fine for a bounded key space,
  a real problem for anything keyed by, say, user-generated IDs over a session that runs
  for hours.

**`WeakRef`** and **`FinalizationRegistry`** exist for the narrow case where you need to
reference an object without keeping it alive yourself — a client-side cache keyed by object
identity, say — but they're a niche tool: `FinalizationRegistry` callbacks run at a GC
engine's discretion, with no timing guarantee, so neither is a substitute for explicit
cleanup in the common case. Reach for them only when explicit lifecycle management (cleanup
functions, `AbortController`) genuinely isn't available.

Separately from leaks, **GC pressure** is about allocation *rate*, not correctness:
allocating a lot of short-lived garbage (a new object per array item on every render, a
`structuredClone` of a large object every time instead of only when it actually changed)
forces the garbage collector to run more often, and a GC pause is itself a blocking
main-thread task that can show up as janky scrolling or a dropped frame with no single line
of "slow" code to blame. `structuredClone` in particular is easy to reach for as a safe
deep-copy and easy to overuse: it walks and copies the entire object graph every call, so
cloning a large object on every render (instead of only when a mutation actually needs
isolation) is a real, avoidable cost.

**Measuring:** the Performance panel's timeline shows GC events alongside long tasks. The
Memory panel's heap snapshot comparison (take one, do the suspect action several times,
take another, compare) is the standard way to confirm a leak: if a count of a specific
constructor (detached nodes, a component class) keeps climbing across snapshots after the
action that created them should have released them, that's a leak, not noise.

## Further reading (optional)

- [web.dev — Virtualize large lists](https://web.dev/articles/virtualize-long-lists-react-window)
- [TanStack Virtual docs](https://tanstack.com/virtual/latest)
- [Chrome DevTools — Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems)
- [MDN — `WeakRef`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
