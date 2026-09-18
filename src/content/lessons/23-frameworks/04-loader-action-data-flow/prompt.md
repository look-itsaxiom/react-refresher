React Router's framework mode (and TanStack Start's loader model) has a rule that's easy
to state and easy to get wrong in a hand-rolled implementation: every matched route's
`loader` runs **in parallel**, not one after another, and after an `action` runs, every
matched loader runs again to refresh the page's data.

This file gives you `createClock` (a deterministic stand-in for real async timing —
loaders call `clock.record(...)` and `await clock.tick()` instead of doing real network
I/O, so the checks can observe call order without waiting on real timers),
`makeLoader`/`makeAction` (fake loader/action factories built on that clock), a `RouteNode`
tree type, and `matchChain` (already implemented — given a tree and a URL, it returns the
matched route chain from root to leaf, or `null`). None of that needs to change.

One function has a bug: **`runNavigation`**. As shipped, it runs each matched route's
loader with `await` inside a `for` loop — one loader has to finish before the next one
even starts. Fix it so all matched loaders run in parallel (`Promise.allSettled` over the
chain, not a sequential loop), and handle the case where a loader throws:

- Build `loaderData`, keyed by route id, from every loader that **succeeded**, even if
  another loader in the same navigation failed. (This is why `Promise.allSettled` and not
  `Promise.all` — one failing loader shouldn't discard data the others already fetched.)
- If any loader threw, return `{ ok: false, errorRouteId, loaderData }` where
  `errorRouteId` is the id of the route whose loader threw (if more than one throws, pick
  the first one in the chain — root to leaf).
- If none threw, return `{ ok: true, loaderData }`.
- Skip route nodes with no `loader` — they contribute nothing to `loaderData` and can
  never be the `errorRouteId`.

`runAction` is already correct and calls your `runNavigation` to revalidate after the
action resolves — once `runNavigation` is fixed, revalidation is fixed for free.
