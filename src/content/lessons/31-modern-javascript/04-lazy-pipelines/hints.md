For `paginate`, get a real iterator out of `source` once, up front: `const it =
source[Symbol.iterator]();`. Then each time the generator resumes, pull from *that same
iterator* — don't call `source[Symbol.iterator]()` again inside the loop, or you'll restart
from the beginning every time.
---
Don't reach for `it.take(size).toArray()` here even though it looks like the obvious
iterator-helper move: `.take()` closes its underlying iterator once its own count is used
up (the call that reports `done` also calls `.return()` on the source), so a *second*
`.take()` call on the same `it` for the next page would find it already closed. Instead,
pull with plain `.next()` calls in a small loop: call `it.next()` up to `size` times,
collect the values, and stop the loop early if `done` comes back `true`. That has no
closing side effect, so `it` is ready to resume on the next call.
---
Stop `paginate` when a page comes back empty (nothing left to yield) — `return` out of the
generator rather than `yield`ing an empty array. If a page comes back shorter than `size`,
yield it (it's real data), but that's also your last page — `return` right after.
---
`pluck` can be a one-liner: `return Iterator.from(source).map((item) => item[key]);`. The
returned object is itself an iterator with the same helper methods, so a caller can chain
`.take(3).toArray()` onto whatever `pluck` returns.
---
For `PagedList`, `useRef<Generator<Person[]> | null>(null)` holds the generator across
renders; initialize it lazily inside an event handler or a `useState(() => ...)`-style
initializer, not directly in the render body, so it's created exactly once. Each "Load
more" click calls `.next()` on the ref's generator, and if `done` is `false`, appends
`value` to the displayed list with `setShown((prev) => [...prev, ...value])`; if `done` is
`true`, flip a `finished` boolean in state so the button can disable itself.
