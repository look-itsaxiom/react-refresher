Playwright's `page.click()` doesn't click immediately — it polls until the element is
actionable, then clicks. This exercise implements that polling loop as two pure functions, driven
by an injected fake clock instead of real time, so the checks run instantly and deterministically.

```ts
type FakeClock = { now(): number; sleep(ms: number): Promise<void> };
type IsVisible = (el: Element) => boolean;

function expectEventually(
  predicate: () => true | string,
  opts: { timeout: number; interval: number; clock: FakeClock },
): Promise<void>;

function actionable(
  el: Element,
  clock: FakeClock,
  isVisible: IsVisible,
  opts?: { timeout?: number; interval?: number },
): Promise<Element>;
```

**`expectEventually(predicate, opts)`** polls `predicate()` on a fixed interval until it succeeds
or times out:
- if `predicate()` returns `true`, resolve immediately — don't wait or sleep even once if it's
  already true on the first call.
- if it returns a `string`, that's a failure message describing why it hasn't happened yet. Wait
  `opts.interval` ms (via `opts.clock.sleep(...)`, never a real `setTimeout`) and try again.
- once `opts.clock.now()` has advanced by at least `opts.timeout` ms since the call started,
  reject with `new Error('timed out after ' + opts.timeout + 'ms: ' + lastMessage)`, where
  `lastMessage` is whatever the most recent failing call to `predicate()` returned.

**`actionable(el, clock, isVisible, opts)`** waits until `el` is all three of:
- **visible**: `isVisible(el)` returns `true` (the stub already accounts for `hidden` and
  `display: none`; you just call it).
- **enabled**: no `disabled` attribute, and `aria-disabled` is not `"true"`.
- **stable**: its `data-position` attribute reads the same on two consecutive polls (a changing
  position means it's still animating).

`opts` defaults to `{ timeout: 2000, interval: 50 }` when omitted. On success, resolve with `el`.
On timeout, reject with an error whose message mentions which check(s) were still failing.

The default export is a small illustrative component — a button that becomes enabled and stops
moving a second after mount — so you can see the real-time version of what the checks simulate
with the fake clock. You don't need to change it.
