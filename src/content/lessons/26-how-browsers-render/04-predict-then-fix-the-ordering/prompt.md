Two things to fix here, both about the event loop.

**1. `runOrdered(steps)`.** Each `step` has a `kind` — `'sync'`, `'microtask'`, `'task'`,
or `'raf'` — and a `label`. The function should return a promise that resolves with the
`label`s in the order the browser would actually run them, given the scheduling API each
`kind` implies (immediate/synchronous, `queueMicrotask`, `setTimeout(fn, 0)`, and
`requestAnimationFrame`, respectively) — **not** the order the steps appear in the array.
Right now it just returns the labels in input order, which is only ever right by
accident. Before you write code: given
`[{kind:'raf'}, {kind:'task'}, {kind:'sync'}, {kind:'microtask'}]`, what order do you
expect? Check your prediction against the concept step, then make the function produce
it.

**2. `yieldToMain()`.** It's supposed to hand control back to the browser's event loop and
resolve on the *next task* — a real yield, not just a microtask. Right now it resolves
immediately, which means anything built on top of it (like the provided `runLongTask`
below) never actually gives the browser a chance to do anything else. Implement it with a
`MessageChannel`, the standard "true yield" primitive that doesn't have `setTimeout`'s
nested-timeout clamp.

`runLongTask(chunks, msPerChunk, onYield?)` is **provided — don't change it**. It
simulates a long synchronous computation broken into `chunks` pieces, calling your
`yieldToMain()` between each one. `App` uses it to run a "long task" while a separate
counter keeps ticking via its own `setTimeout` loop — if your `yieldToMain` is a real
yield, that counter keeps advancing throughout; if it isn't, the long task blocks the
counter for its entire duration.
