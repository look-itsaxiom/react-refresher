# Designing for testability

Most "this is hard to test" complaints are design problems wearing a testing costume. A component
that's awkward to test is usually also awkward to reuse, reason about, or fix at 2am — the test is
just the first place the friction shows up. Designing for testability up front is cheaper than
retrofitting it, and the techniques are the same ones that make code testable by hand, by an
LLM-generated test, or by a teammate six months from now who has no memory of writing it.

## Query by role and label: accessibility as a test contract

Testing Library's guiding rule is to query the DOM the way a user (or assistive technology) finds
things: `getByRole('button', { name: /submit/i })`, `getByLabelText('Email')`, not
`querySelector('.btn-primary')` or `getByTestId('submit-btn')`. This isn't a testing-library
opinion so much as a forcing function — a component you can only query by test id is very often a
component with no accessible name, no semantic element, and no keyboard path, and a real user
running a screen reader hits the identical wall a role-based query does. Keep `data-testid` as a
genuine escape hatch (a decorative element with no sensible role, a third-party widget you don't
control), not the default. As of `@testing-library/user-event` 14, the project's own docs now
point new component-level work toward Vitest Browser Mode or Playwright for anything that needs a
real browser's event and layout behavior — `user-event` still fills the gap for jsdom, but the
underlying advice hasn't changed: prefer the query that mirrors what a person can actually perceive.

## Inject the things that make output non-deterministic

`Date.now()`, `Math.random()`, and a module-level `fetch` call are three of the most common reasons
a component that behaves correctly is impossible to test reliably. Each has the same fix: pull it
out from behind a parameter with a default.

```tsx
type ReportProps = {
  now?: () => number;
  loadReport?: () => Promise<Report>;
};

export default function Report({ now = Date.now, loadReport = fetchReportFromApi }: ReportProps) {
  // production code calls Report() and gets the real clock and the real fetch
  // a test calls Report({ now: () => FIXED_TIME, loadReport: () => Promise.resolve(stub) })
}
```

This is dependency injection without a container or a framework — just a default parameter. It
costs nothing in production (the default *is* the real behavior) and buys a test complete control
over the one axis that made the output flaky. The same move applies to randomness: a promo-code
generator that takes a `random: () => number` parameter is exactly as random in production and
exactly reproducible in a test that passes a fixed function. Where a whole test suite needs the
same determinism, standardize on a seeded PRNG rather than hand-rolled fixed values, so "run it
again with the same seed" reproduces a failure instead of hoping `Math.random()` cooperates twice.

## Avoid module-level singletons

A cache, a counter, or a "already fetched" flag declared at module scope persists across every
test that imports that module in the same process — one test's side effect leaks into the next
test's assumptions, in whatever order the runner happens to execute them. This course's own
exercise runner resets its fake server before every single check for exactly this reason: shared
mutable module state is the single most common source of "it fails only when run with the other
tests." Prefer state that's created fresh per call (a factory function, a class instance, a
`useState` initializer) over a value computed once at import time and reused forever.

## Separate pure logic from React

A reducer, a totals calculator, a validation function — none of these need a DOM, a render, or
`act()` to test. If the logic that decides *what* happens can be pulled out of the logic that
decides *how it's drawn*, test the extracted function directly and let the component test cover
only the wiring: does clicking the button dispatch the right action, does the right prop reach the
right place. This is the same "hook is a function that calls hooks" instinct from earlier in this
course, generalized: extract when the logic is worth pinning down on its own, particularly
anything with edge cases (rounding, caps, "what if the id doesn't exist") that are tedious to
trigger by simulating clicks but trivial to call directly with the exact input that exposes them.

## Stable structure, and the `act` you already know

Testing Library's async utilities (`findBy*`, `waitFor`) and `user-event`'s built-in `act()`
wrapping exist because React batches and schedules updates — a click that triggers a state update
doesn't always finish synchronously, and asserting before it settles is a race, not a real
assertion. You've already seen this pattern with `renderHook` and Suspense-driven components
earlier in the course; testability here is the same discipline: stable `key`s so React doesn't
unmount and remount siblings you expect to persist, and DOM structure that doesn't shuffle roles
around between renders for no reason a query could account for.

## A decision checklist for a PR

Before deciding what a change needs, ask:

1. Can a type or a lint rule catch this class of bug for free? If yes, that's the layer — don't
   write a runtime test for something the compiler already guarantees.
2. Is there new pure logic (a calculation, a state transition, a parser)? Unit-test it directly.
3. Does a component's behavior change from a user's point of view? Add or update a component test
   querying by role/label, not by re-asserting internal state.
4. Does this touch a seam — auth, payment, a multi-step flow — where "it works end to end" is the
   actual requirement? That's the one to consider for Playwright, not every change.
5. Is this purely visual (spacing, color, a new icon)? A visual regression tool, not a fragile
   snapshot of markup, is the right layer.

## Further reading

- [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles/) — testing-library.com
- [`@testing-library/user-event` docs](https://testing-library.com/docs/user-event/intro/) — testing-library.com
- [React docs: Testing](https://react.dev/learn/thinking-in-react) — react.dev
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices) — playwright.dev
