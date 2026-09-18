Build a tree while `describe`/`it` are called, then walk it in `run()` — don't try to run tests
as you register them. Keep a mutable "current suite" pointer: `describe` pushes a new suite node
onto its parent's children, temporarily reassigns "current" to the new suite, calls the callback
(which registers its children onto the now-current suite), then restores "current" to the parent.
`it`, `beforeEach`, and `afterEach` all just push onto whatever suite is currently "current".

---

For traversal, collect every test with the *chain* of ancestor suites that contain it (root
first, immediate parent last) — a simple recursive walk that accumulates `[...chain, suite]` as
it descends handles this. `fullName` is `chain.filter(name-is-not-null).map(name)` plus the
test's own name, joined with `" > "`. The `beforeEach` order for a test is "for each suite in
the chain, in order, run its beforeEach hooks" — that's already outermost-first because root is
first in the chain. `afterEach` is the same chain reversed.

---

For `it.only`: first collect *every* test in the tree (skipped ones included), then check
whether any of them has `mode === 'only'`. If so, every test that is not itself `.only` should
be treated exactly like a skipped test for this run (increment `skipped`, don't call its `fn`).
`.skip` always skips regardless of `.only`.

---

For the timeout, wrap the test call in a `new Promise` that races a `setTimeout` rejection
against the test's own resolution/rejection — something like:

```ts
function runWithTimeout(fn: () => void | Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error(`test timed out after ${ms}ms`)); }
    }, ms);
    Promise.resolve().then(fn).then(
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } },
      (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } },
    );
  });
}
```

Wrap the `beforeEach`/test/`afterEach` sequence for each test in its own `try`/`catch`/`finally`:
catch the failure (from a hook or the test itself), always run the `afterEach` chain in
`finally`, and push to `report.failed` only after teardown has run — that's what makes cleanup
happen even on a thrown error.
