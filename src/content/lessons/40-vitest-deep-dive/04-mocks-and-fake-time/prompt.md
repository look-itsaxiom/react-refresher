Two small pieces of `vi.fn`/`vi.useFakeTimers`, built from scratch so the mechanics stop being
magic.

**`fn(impl?)`** — a minimal `vi.fn`:

- Calling the returned function records the call's arguments in `mock.calls` and its outcome in
  `mock.results`: `{ type: 'return', value }` on a normal return, `{ type: 'throw', value: error
  }` if the implementation threw — and the mock must still re-throw in that case, not swallow it.
- `mockReturnValue(v)` makes every subsequent call (not already covered by a queued "once")
  return `v`.
- `mockResolvedValue(v)` is shorthand for `mockReturnValue(Promise.resolve(v))`.
- `mockImplementationOnce(impl)` queues `impl` for exactly the next call, then the mock falls
  back to whatever `mockReturnValue` set (or the implementation passed to `fn`, or `undefined`).

**`createFakeClock()`** — a controllable clock with `setTimeout`, `setInterval`, `clearTimeout`,
`clearInterval` that mirror the real globals' signatures, plus:

- `advanceBy(ms)` — fires every timer that falls due within the next `ms` of *virtual* time, in
  time order, without any real waiting.
- `runAll()` — fires every currently- and newly-scheduled timer until none remain due (guard
  against a `setInterval` that would fire forever).

A `setInterval` timer reschedules itself `+ms` from when it fires, so a single `advanceBy` call
spanning several periods must fire it that many times, in order. A timer scheduled *inside* a
firing callback must also fire within the same `advanceBy`/`runAll` call if its due time falls
inside the window being advanced — real timers behave the same way, they just take real
milliseconds to prove it.

The starter's default `App` schedules a one-shot timer and an interval on a fake clock and prints
what fired after one `advanceBy` call, so you can watch ordering as you build it.
