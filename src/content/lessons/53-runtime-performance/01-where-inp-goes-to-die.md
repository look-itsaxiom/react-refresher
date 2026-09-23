# Where INP goes to die

[Lesson 49](/) defined INP (Interaction to Next Paint) as the time from an interaction to
the next frame the browser paints in response, and named its three phases without
dissecting them. This lesson dissects them, because each phase fails for a different
reason and gets fixed with a different tool.

## The three phases

- **Input delay** — from the physical click/keypress/tap to the moment your event
  handler starts running. This is *not* caused by the handler itself; it's caused by
  whatever else is occupying the main thread when the input arrives — a long task from an
  unrelated `setTimeout`, a big `useEffect`, a third-party script, or (very commonly) React
  still flushing a previous render. A handler that runs in 2ms can still produce a 400ms
  INP if the input had to wait 398ms just to be picked up.
- **Processing time** — the event handler itself, plus any synchronous render work it
  triggers. This is the phase most people mean when they say "my code is slow": a handler
  that filters 50,000 rows, a `setState` that re-renders a huge subtree, a synchronous
  `JSON.parse` of a large payload.
- **Presentation delay** — from "the browser has computed the new frame" to "the pixels
  are actually on screen." Expensive style recalculation, layout, and paint work all land
  here — this is where [lesson 26](/)'s layout-thrashing and forced-reflow material pays
  off directly, because a forced synchronous layout inside your handler gets counted in
  *processing*, but the layout/paint the browser does afterward to actually render the
  result is presentation delay.

INP reports the sum, and a 300ms INP with 10ms input delay, 20ms processing, and 270ms
presentation is a completely different bug from one with 250ms input delay and 30ms of the
other two combined. Fixing the wrong phase doesn't help.

## Diagnosing which phase is the problem

Chrome's Performance panel timeline for a recorded interaction shows all three phases as
distinct segments on the interaction's row. As of September 2026, the browser-native way to
get this breakdown programmatically — without recording a full trace — is the **Long
Animation Frames (LoAF) API**: `PerformanceObserver` with `entryTypes: ['long-animation-frame']`
delivers `PerformanceLongAnimationFrameTiming` entries whose `scripts` array attributes time
to specific script sources and functions, and whose `renderStart`/`styleAndLayoutStart` fields
split out the presentation cost. LoAF ships in Chrome/Edge and Chrome for Android (since
Chrome 123) but not Firefox or Safari, so it isn't Baseline — treat it as a Chrome-only
diagnostic signal, same caveat as `scheduler.yield()` below, not something to build a
cross-browser feature on. The `web-vitals` library's attribution build (`web-vitals/attribution`,
covered in lesson 49) surfaces the phase breakdown for real INP entries without you wiring up
LoAF yourself.

## Yielding strategies for processing time

Once you've confirmed processing time is the bottleneck, the fix is never "make the
computation itself faster" — it's "do the same computation without blocking the thread for
one uninterrupted stretch." [Lesson 26](/) covered the event-loop mechanics; here's the
API surface built on top of them:

- **`scheduler.yield()`** — inside an async function already running as a task, `await
  scheduler.yield()` hands control back to the event loop and resumes on a new task,
  keeping your position in a loop without restructuring it into callbacks. It also
  reprioritizes: continuation runs at `'user-visible'` priority by default, and other
  `'user-blocking'` work queued in the meantime can run first.
- **`scheduler.postTask(fn, { priority })`** — schedules `fn` as a new task at
  `'user-blocking'`, `'user-visible'`, or `'background'` priority, with an `AbortSignal`
  for cancellation. Use it to explicitly de-prioritize non-urgent work (analytics,
  prefetching) below whatever the user is currently doing.
- As of September 2026, both are Chrome/Edge-only — Firefox and Safari support neither, so
  neither is Baseline. Production code needs a fallback: a `MessageChannel` round-trip (or
  `setTimeout(fn, 0)` as a last resort) gives the same "yield to a new task" behavior with
  worse prioritization but universal support.
- **`navigator.scheduling.isInputPending()`** — synchronously reports whether a pending
  input event is waiting, without yielding. A chunked loop can check this every N
  iterations and only yield when it's actually true, instead of yielding on a fixed
  schedule that might yield when nothing is waiting anyway. Chrome-only; treat it as an
  optimization on top of a fixed-interval yield, not a replacement for one, since a
  fallback path still needs to yield unconditionally.

## Feedback first, then work

The highest-leverage fix for processing time often isn't yielding at all — it's reordering.
If a click triggers 200ms of work and then updates the UI to show the result, the user
stares at an unresponsive control for 200ms. If the handler instead updates the UI to show a
pending state *immediately* (disable the button, show a spinner, set `aria-busy="true"`),
then does the 200ms of work, the perceived-responsiveness win is enormous even though the
total wall-clock time is identical — and the *measured* INP improves too, because the next
paint the browser measures against is the pending-state paint, not the finished-state paint.
This only works if the pending-state update actually gets painted before the heavy work
starts, which means yielding at least once between "set pending state" and "start the heavy
work" — setting state alone doesn't force a paint if a synchronous task keeps running
immediately afterward.

## Cheap wins in the same family

A few practices reduce all three phases without any scheduling code:

- **Passive event listeners** (`addEventListener('touchstart', fn, { passive: true })`) tell
  the browser your handler won't call `preventDefault()`, so scroll/touch handling doesn't
  have to wait for the handler to finish before starting to scroll — this removes handler
  time from the user-visible latency entirely for that class of interaction.
- **Debounce/throttle high-frequency input** (`input`, `scroll`, `pointermove`) so the
  handler runs at most once per animation frame; wrapping the state update in
  `requestAnimationFrame` batches bursts of events into one update per paint instead of one
  update per event.
- **CSS containment and `content-visibility`** — `contain: layout paint` (or `content` for
  both) scopes layout/paint recalculation to a subtree, so a change inside it can't force
  the browser to re-measure siblings. `content-visibility: auto` goes further: an
  off-screen element with it set skips layout, paint, and its own render tree generation
  almost entirely, resizing itself to `contain-intrinsic-size` as a placeholder. Both
  properties are Baseline (newly available since September 2024: Chrome/Edge 85+, Firefox
  125+, Safari 18.1+), so they're safe to reach for. This is exactly the presentation-delay
  win virtualization (next concept) achieves at the DOM level instead of the CSS level.
- **Animate compositor-only properties** — `transform` and `opacity` changes can skip layout
  and paint entirely and run on the compositor thread, immune to main-thread long tasks.
  `will-change` hints the browser to promote an element to its own compositor layer ahead of
  time, but it isn't free: every layer costs GPU memory and compositing time, and leaving
  `will-change` on too many elements (or permanently, instead of toggling it on right before
  the animation and off after) can make scrolling *worse* by fragmenting the page into more
  layers than the GPU budget wants.

## Further reading (optional)

- [web.dev — Optimize long tasks](https://web.dev/articles/optimize-long-tasks)
- [Chrome for Developers — Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [MDN — `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility)
- [web.dev — `scheduler.yield()`](https://developer.chrome.com/blog/scheduler-yield-origin-trial)
