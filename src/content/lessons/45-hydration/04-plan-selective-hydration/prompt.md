# Plan selective hydration

Model the scheduling rule from the concept step — interaction jumps the
queue, otherwise priority order — as two pure functions. There's nothing to
render here; the checks call your functions directly.

```ts
type Boundary = { id: string; ready: boolean; priority: number };
type QueuedEvent = { boundaryId: string; type: string };
```

### `planHydration(boundaries, interactions)`

`interactions` is the list of boundary ids the user clicked or typed into,
in the order those interactions happened, before hydration finished. Return
the ids of the `boundaries` that are `ready: true`, in the order they should
hydrate:

1. Any boundary the user interacted with hydrates first, in the order it was
   interacted with (deduplicated — interacting twice with the same boundary
   doesn't move it twice). A boundary that isn't `ready` yet can't jump the
   queue, no matter how many times it was clicked — its data hasn't arrived,
   so there's nothing to hydrate.
2. Every other `ready` boundary follows, in ascending `priority` order
   (lower number hydrates first). Boundaries with equal priority keep their
   original relative order from the `boundaries` array.
3. Boundaries that aren't `ready` are left out of the result entirely — they
   aren't part of this hydration pass at all.

### `replayEvents(order, queuedEvents)`

`order` is the result of `planHydration`. `queuedEvents` are the events that
arrived (were queued by React's capture listener) for various boundaries
before any of them had hydrated. Return the events, reordered so that all of
a boundary's events come out together, grouped in the order that boundary
appears in `order`, preserving each boundary's own events in their original
relative order. Drop events for any `boundaryId` that isn't in `order` — a
boundary that's never going to hydrate this pass has nothing to replay into.
