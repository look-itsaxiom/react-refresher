Implement `createEventStream`:

```ts
type EventStream<T> = {
  push(value: T): void;
  close(): void;
  readonly consumers: number;
  [Symbol.asyncIterator](): AsyncIterator<T>;
};

function createEventStream<T>(): EventStream<T>
```

It's a small async queue: something that turns "values arriving over time" (think: a click
handler, a WebSocket's `onmessage`, anything push-based) into something a `for await` loop
can pull from, one value at a time — the pattern used to bridge an event source into async
iteration.

- **`push(value)`** hands `value` to whichever consumer is currently waiting for the next
  one, if any; otherwise it queues the value for whenever a consumer next asks. Values
  pushed *before* anyone starts consuming should still be delivered, in order, once
  consumption starts — nothing is lost.
- **`close()`** ends iteration going forward: any consumer already waiting on a value should
  have that wait resolve immediately with `{ done: true }` instead of hanging forever, and
  any future call to `next()` should resolve the same way.
- **`consumers`** is the number of async iterators currently "subscribed" — it goes up the
  moment `[Symbol.asyncIterator]()` is called, and back down when that consumer stops, via
  either exhausting the stream (`close()`) or having `.return()` called on its iterator
  (which is what happens automatically when a `for await` loop `break`s, or — for the
  `Feed` component below — when the effect that started consuming is cleaned up on unmount).
  A stream nobody has cleaned up after should never report more consumers than are actually
  still active.

`Feed` (provided, don't change it) is a small component that consumes a stream you pass it
and renders every value it receives, calling `iterator.return()` when it unmounts so an
unmounted component can't keep "listening" — that's the leak this exercise is really about.
`App` wires up a `Feed` against a stream of its own for the live preview.
