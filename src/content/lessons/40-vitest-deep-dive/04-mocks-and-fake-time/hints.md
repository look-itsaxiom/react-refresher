For `fn`: keep a "default implementation" variable (starts as whatever was passed to `fn`) and a
FIFO queue for `mockImplementationOnce`. On each call, shift the queue first; if it's empty, fall
back to the default. Wrap the call in `try`/`catch` so you can push `{ type: 'return', value }`
or `{ type: 'throw', value: error }` into `mock.results` either way — and re-`throw` in the catch
branch after recording, so the caller still sees the error.

---

`mockReturnValue(v)` and `mockResolvedValue(v)` both just replace the "default implementation"
with a function that ignores its arguments and returns `v` (or `Promise.resolve(v)`). Each mock
method should `return mockFn` so calls can chain, though the checks don't require chaining.

---

For the clock, model each timer as `{ id, time, cb, intervalMs }` where `time` is the *absolute*
virtual instant it's next due (not a remaining delay) — `setTimeout(cb, ms)` schedules `time = now
+ ms`; `setInterval` is the same but also stores `intervalMs` so you know to reschedule instead of
delete after it fires. Keep every pending timer in a `Map` keyed by id so `clearTimeout`/
`clearInterval` can just delete an entry.

---

Write one `fireUpTo(targetTime)` helper that both `advanceBy` and `runAll` call
(`advanceBy(ms)` → `fireUpTo(now + ms)`, `runAll()` → `fireUpTo(Infinity)`). In a loop: find the
pending timer with the smallest `time` that is `<= targetTime` (break the tie by id, so
same-instant timers fire in registration order); if none exists, stop. Otherwise set
`now = timer.time`, delete it (or reschedule `time = now + intervalMs` for an interval) *before*
calling its callback — that ordering matters, because the callback might schedule a new timer
whose due time also falls within the window, and the loop needs to pick that up on its next
pass. Cap the number of iterations (e.g. 10,000) and throw if you blow past it, so a
never-cleared interval can't hang the test.
