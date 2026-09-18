Don't reach for `async function*` here, even though this is exactly the kind of thing
generators usually model well. The problem is cancellation: if the generator is suspended
inside an `await` waiting for a value that never arrives, calling `.return()` on it doesn't
interrupt that `await` — the generator can only actually unwind and run its `finally` block
the *next* time it resumes, which might be never. Write the iterator as a plain object with
your own `next()` and `return()` methods instead, so `return()` can resolve things
immediately and synchronously, on your own terms.

---

Keep one queue (an array) and at most one "someone is waiting" slot — a single stashed
`resolve` function for whichever `next()` call is currently pending, since this stream only
needs to support one consumer at a time:

```ts
const queue: T[] = [];
let waiting: ((result: IteratorResult<T>) => void) | null = null;
let closed = false;
```

`push`: if `waiting` is set, call it directly with `{ value, done: false }` and clear it;
otherwise push onto `queue`. `close`: set `closed = true`, and if `waiting` is set, call it
with `{ value: undefined, done: true }` and clear it — that's what makes a pending `next()`
resolve immediately instead of hanging.

---

`[Symbol.asyncIterator]()` should increment a `consumers` counter *synchronously*, right
when it's called — before the caller ever calls `next()` — and return an object with `next`
and `return`. Track "is this particular consumer done" with a local `done` flag inside the
closure, separate from the stream's own `closed` flag, so calling `return()` on one consumer
doesn't affect others (even though this exercise only really exercises one at a time):

```ts
return {
  async next() {
    if (done) return { value: undefined as unknown as T, done: true };
    if (queue.length > 0) return { value: queue.shift()!, done: false };
    if (closed) { done = true; consumers--; return { value: undefined as unknown as T, done: true }; }
    const result = await new Promise<IteratorResult<T>>((resolve) => { waiting = resolve; });
    if (result.done) { done = true; consumers--; }
    return result;
  },
  async return(value?: T) {
    if (!done) { done = true; consumers--; }
    return { value: value as T, done: true };
  },
};
```

`return()` decrements `consumers` and marks `done` *without* touching `waiting` or needing
to await anything — that's exactly what makes it able to resolve synchronously even while a
`next()` call is stuck waiting on a value that will now never come.
