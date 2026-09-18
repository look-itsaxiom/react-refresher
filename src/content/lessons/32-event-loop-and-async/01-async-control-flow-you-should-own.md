# Async control flow you should own

Promises and `async`/`await` stopped being novel a decade ago, but the primitives around
them keep growing: [Lesson 26](/) covered the mechanics of the event loop itself
(microtasks vs. tasks, `scheduler.yield`); [Lesson 25](/) covered retrying a flaky request
with backoff. This lesson is about the layer in between — combining promises correctly,
cancelling them, and consuming values that arrive over time instead of once.

## The four combinators, and what "failure" means for each

- **`Promise.all(iterable)`** resolves with every result once *all* promises fulfill, or
  rejects as soon as **any one** rejects — with that promise's reason, immediately, without
  waiting for the others. The other promises keep running; you just stop listening to them.
  That's the right choice when every result is required and one failure makes the whole
  batch useless (fetch a user and their permissions before rendering a page).
- **`Promise.allSettled(iterable)`** never rejects. It resolves with an array of
  `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` for every input, once
  they've *all* settled. Use it when partial success is meaningful — refreshing five
  independent dashboard widgets, where one failing shouldn't blank the other four.
- **`Promise.race(iterable)`** settles as soon as the first promise settles, fulfilled or
  rejected. It's a genuine race, not "first success" — a fast rejection wins over a slow
  fulfillment. That makes it the wrong tool for "give me whichever succeeds first" (that's
  `any`) and the right tool for racing a request against a timeout promise, where you want
  to know the *outcome*, whichever comes first.
- **`Promise.any(iterable)`** resolves with the first fulfillment and ignores rejections —
  unless *every* input rejects, in which case it rejects with an `AggregateError` whose
  `.errors` array holds every individual reason, in input order. Use it for "try three CDN
  mirrors, take whichever responds" style fallback logic.

A detail that trips people up: none of these combinators cancel the promises they didn't
"pick." `Promise.race` returning early doesn't stop the loser's underlying fetch; if that
loser later rejects and nothing is attached to it, you get an **unhandled rejection** —
logged as a console warning at best, a crashed process in some server runtimes at worst. If
you start a promise, either await it, `.catch()` it, or explicitly hand it to something
that will (see `AbortController` below). This is also why unbounded concurrency is a real
cost, not just a style nit: firing `Promise.all(items.map(fetchOne))` over 500 items doesn't
run 500 requests one at a time, it runs 500 requests *at once* — against a browser's
per-origin connection limit, a rate-limited API, or a database pool sized for a handful of
concurrent queries. The fix is a concurrency limiter (this lesson's first exercise), not
`allSettled` — settling doesn't cap how many run simultaneously, it only changes how
failures are reported.

## `AbortController` is the one cancellation primitive to actually learn

Cancelling a promise itself isn't possible — once created, it will settle. What you cancel
is the *work* the promise represents, and the browser-wide way to signal "stop" is
`AbortController`/`AbortSignal`, not a bespoke `cancelled` flag per API:

```ts
const controller = new AbortController();
fetch('/api/data', { signal: controller.signal });
controller.abort(new Error('user navigated away')); // any reason, defaults to a DOMException
```

A few pieces worth knowing beyond the basic `fetch(url, { signal })` call:

- **`signal.throwIfAborted()`** throws the abort reason if the signal is already aborted,
  otherwise does nothing — a clean guard at the top of a function or loop iteration, instead
  of `if (signal.aborted) throw ...`.
- **`AbortSignal.any([sigA, sigB])`** returns a new signal that aborts as soon as *any* of
  its inputs do, carrying whichever reason fired first. This is how you compose "abort on
  unmount" with "abort on a 5-second timeout" (`AbortSignal.timeout(5000)`) without writing
  a manual combinator — pass `AbortSignal.any([componentSignal, AbortSignal.timeout(5000)])`
  as the one signal a function accepts.
- **Cleanup, not just checking.** If you register `signal.addEventListener('abort', fn)`,
  remove it (`{ once: true }`, or an explicit `removeEventListener`) once the work finishes
  normally — an abort listener that outlives its work is a small leak, and on a long-lived
  signal (say, one scoped to a whole page session) those add up.
- **A function that accepts a `signal` should accept it optionally and pass it through**,
  not swallow it. Every async utility you write — a retry wrapper, a concurrency limiter, a
  polling loop — should take `{ signal? }` and forward it to whatever it calls, the same way
  `fetch` does. That's what makes composition work: the caller decides what "cancelled"
  means, the utility just respects it.

## Async iteration: pulling values instead of racing to one

`async function*` (an async generator) and `for await (const x of iterable)` let you
consume values that arrive over time — paginated API results, WebSocket messages, or
anything modeled as a queue — the same way a regular `for...of` consumes an array, one
`await` per value:

```ts
async function* paginate(url: string) {
  let next: string | null = url;
  while (next) {
    const page = await fetch(next).then((r) => r.json());
    yield page.items;
    next = page.nextUrl;
  }
}

for await (const items of paginate('/api/items')) {
  render(items); // one page at a time, as each arrives
}
```

This is **backpressure-friendly** by construction: the producer only does the work to
produce the next value once the consumer calls `next()` (which `for await` does after each
loop body finishes) — nothing buffers unboundedly if the consumer is slow. Contrast that
with `array.forEach(async (x) => await doThing(x))`: `forEach` doesn't await its callback,
so this fires every `doThing` call immediately, in parallel, uncontrolled, and `forEach`
itself returns before any of them settle — a classic footgun covered again in this lesson's
quiz.

`Array.fromAsync(asyncIterable)` collects an async iterable into a real array when you *do*
want everything buffered — the async-iterable equivalent of `Array.from`, useful for
turning a paginated generator like the one above into a single awaited array when you know
the result set is bounded. There's no built-in the other direction (array → async
iterable with backpressure) beyond writing a small queue yourself, which is exactly what
this lesson's second exercise builds. `Promise.withResolvers()` — a small but genuinely
useful addition for wrapping event-based or callback APIs in a promise without the
`new Promise((resolve, reject) => { ... })` indentation — gets its own treatment in
[Lesson 31](/); it shows up here only as a building block you may reach for while writing an
event queue's producer side.

## Further reading

- [MDN — `Promise.any()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any)
- [MDN — `AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static)
- [MDN — `AbortSignal.throwIfAborted()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted)
- [MDN — Iterators and generators: `for await...of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
- [MDN — `Array.fromAsync()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync)
