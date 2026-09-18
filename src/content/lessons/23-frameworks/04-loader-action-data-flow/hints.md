The sequential version awaits each loader inside the loop before starting the next one.
To run them in parallel, start every loader call *before* awaiting any of them — build an
array of promises first (e.g. with `.map`), then await the whole array at once.
---
`Promise.all` rejects the whole batch as soon as one promise rejects, which would lose the
data from loaders that already succeeded. `Promise.allSettled` instead waits for every
promise to settle and gives you a `{ status: 'fulfilled', value }` or
`{ status: 'rejected', reason }` for each one, in the same order you passed them in.
---
Filter the chain down to nodes that actually have a `loader` first (so array indices line
up between your filtered node list and the `Promise.allSettled` results), map each one to
a promise that resolves with both the loader's data and its route id (so you know which
result belongs to which route), then walk the settled results in order: fulfilled ones go
into `loaderData` keyed by id, and the first rejected one you encounter becomes
`errorRouteId` (skip recording further ones — "first" means first in chain order, which is
the order you iterate, since the array preserves the order it was built in).
---
Full shape:
```ts
const withLoaders = chain.filter((n) => n.loader);
const settled = await Promise.allSettled(
  withLoaders.map((n) => n.loader!(clock).then((data) => ({ id: n.id, data }))),
);
```
Then loop `settled` alongside `withLoaders` by index to fill `loaderData` and find the
first `status === 'rejected'` entry's corresponding node id.
