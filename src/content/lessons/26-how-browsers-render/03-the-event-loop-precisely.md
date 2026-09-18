# The event loop, precisely

"The event loop" gets waved at a lot; the ordering it actually guarantees is precise and
worth being exact about, because it's the mechanism behind why some `setState` calls feel
instant and others cause a dropped frame, and it's what React's scheduler is built on top
of, not a replacement for.

## Tasks, microtasks, and rendering are three different queues

- A **task** (a.k.a. macrotask) is a unit of work the browser schedules and runs to
  completion: a `setTimeout`/`setInterval` callback, a UI event dispatch (click, input),
  a `<script>` execution, a network callback. The browser runs one task, then checks the
  other queues, then may run another task.
- A **microtask** is queued by `queueMicrotask()` or a resolved/rejected Promise's
  `.then`/`.catch`/`.finally`. After every task finishes — and after every individual
  step of a task, technically, but in practice this shows up as "after the current
  synchronous stack unwinds" — the browser drains the **entire microtask queue**,
  including microtasks queued by microtasks that ran during that same drain, before doing
  anything else. Nothing else runs while microtasks are draining: not another task, not a
  rendering update, not another turn of a `requestAnimationFrame`.
- **Rendering** ("update the rendering") is not a queue of callbacks you schedule
  directly — it's an opportunity the browser takes, roughly once per display refresh
  (~16.7ms at 60Hz, less often if the tab is busy or backgrounded), *between* tasks, after
  the microtask queue is empty. This is where style recalculation, layout, paint, and
  `requestAnimationFrame` callbacks happen. `requestAnimationFrame(cb)` schedules `cb` to
  run as part of the *next* rendering opportunity the browser actually takes — not on a
  fixed delay, and not guaranteed to run before the next task if no rendering opportunity
  occurs first. In practice, a `setTimeout(fn, 0)` queued around the same time as a
  `requestAnimationFrame` callback usually runs first, because task queue processing
  isn't gated on a ~16ms frame boundary the way rendering is.

The practical ordering for a burst of same-tick scheduling is: **synchronous code
finishes → all microtasks drain → (maybe) rendering, including `requestAnimationFrame` →
the next task pulled off the queue**, and that next task's completion triggers another
microtask drain, and so on.

## `queueMicrotask` vs `MessageChannel` vs `scheduler.postTask`/`yield`

- `queueMicrotask(fn)` (and `Promise.resolve().then(fn)`, equivalent for scheduling
  purposes) is the cheapest way to defer work, but it does **not** yield to the browser —
  it runs before the next rendering opportunity and before any pending task, so chaining
  microtasks to break up long synchronous work does nothing for responsiveness. It's for
  ordering, not for giving the main thread a break.
- A `MessageChannel`'s `port.postMessage()` → `port.onmessage` round-trip is a genuine
  task boundary with none of `setTimeout`'s baggage: browsers clamp `setTimeout` to a
  minimum ~4ms once you're 5+ levels deep in nested timeouts (a legacy throttling rule),
  which silently caps how many times per second you can yield-and-resume. `MessageChannel`
  doesn't have that clamp, which is why it became the standard "true yield" primitive
  before a dedicated API existed — it's what libraries like React have used internally for
  exactly this.
- `scheduler.postTask(fn, { priority })` and `scheduler.yield()` are the purpose-built
  Scheduler API: `postTask` schedules `fn` at `'user-blocking'`, `'user-visible'`, or
  `'background'` priority (with an `AbortSignal` for cancellation), and `yield()` — inside
  an already-running task — returns a promise that resolves on a new task, letting you
  yield mid-function without losing your call stack the way splitting a function across
  callbacks does. As of September 2026 both ship in Chrome and Firefox but not Safari, so
  neither is Baseline; production code still needs a `MessageChannel` (or `setTimeout`)
  fallback.

## Long tasks and INP

A **long task** is any task that occupies the main thread for more than 50ms — the
threshold comes from the Long Tasks API and, informally, from RAIL guidance about the
maximum the UI can be blocked before an interaction reads as stalled. **INP
(Interaction to Next Paint)**, which replaced FID as a Core Web Vital in March 2024,
measures the time from a user interaction to the next frame the browser actually paints
in response — and a long task sitting between the click and that paint is the single most
common cause of a bad INP score. Breaking a big synchronous computation into chunks with a
yield in between (`await yieldToMain()` in a loop, or `scheduler.yield()`) doesn't reduce
the total work; it lets the browser interleave a paint (and other pending input) between
chunks, which is what INP is actually measuring.

## Why React's scheduler exists

React ships its own cooperative scheduler (in the `scheduler` package) instead of relying
solely on `requestAnimationFrame` or raw `setTimeout`, because none of the browser
primitives alone give it what concurrent rendering needs: a way to do a unit of work, ask
"has more time expired than a frame budget allows, or does something more urgent exist?",
and if so, hand control back to the browser *before* the current task ends — using the
same `MessageChannel`-based "true yield" technique described above, predating
`scheduler.yield()` by years. [Lesson 8](/) covers what this buys React functionally:
each unit of work belongs to a **lane** (priority bucket), and React's work loop is the
piece that actually walks fiber trees a chunk at a time and yields between chunks — the
event loop mechanics here are what "yields between chunks" is built out of. A `SyncLane`
update flushes in the current task without yielding; a `TransitionLane` update runs
through this same time-sliced loop, checking after every few components whether it should
yield back to the browser for a paint or a more urgent input.

## Web Workers: the actual escape from the main thread

Everything above is about *scheduling* work on the main thread more cooperatively — it
doesn't change where the work runs. A `Worker` (or a shared/service worker) runs JS on an
entirely separate thread with its own event loop, no access to the DOM, and communicates
back via `postMessage`. For genuinely expensive synchronous work — parsing a large
payload, image processing, a big client-side sort/diff — moving it to a worker is strictly
better than chunking it on the main thread with yields, because the main thread isn't
blocked *at all* during that work, not just less blocked. Chunking-with-yields is the
right tool when the work needs the DOM or must interleave tightly with UI state; workers
are the right tool when it doesn't.

## Further reading

- [MDN — In depth: Microtasks and the JavaScript runtime environment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Asynchronous/Concepts)
- [web.dev — Optimize long tasks](https://web.dev/articles/optimize-long-tasks)
- [web.dev — Interaction to Next Paint (INP)](https://web.dev/articles/inp)
- [Chrome for Developers — Use `scheduler.yield()` to break up long tasks](https://developer.chrome.com/blog/use-scheduler-yield)
