`OrderSummary` renders correctly in the app — open the preview and it looks fine — but it's
impossible to test reliably:

- The delivery date is computed from `Date.now()` inside the component, so the text is different
  every day.
- The promo code is generated from `Math.random()`, so it's different every render.
- The order data comes from a module-level loader function called directly inside a `useEffect`,
  so a test has no way to control what data the component receives.
- Every element is a `<div data-testid="...">`. There isn't a heading, a table, or a label
  anywhere, so a query by role or text has nothing reliable to find.

None of this is a rendering bug — the component displays the right thing. It's a testability bug:
behavior is entangled with non-deterministic globals, a hardcoded data source, and markup with no
semantics. Fix it without changing what the order actually contains:

1. Accept three optional props — `now`, `random`, and `loadOrder` — each defaulting to the real
   thing the component already uses (`Date.now`, `Math.random`, and the existing order loader).
   Use the injected version everywhere the component currently reaches for the global directly.
2. Replace the `data-testid` div soup with semantic HTML: a heading that includes the order id, a
   `<table>` for the line items with real header cells, and plain paragraph text for the subtotal,
   delivery date, and promo code — no `data-testid` needed anywhere in the result.

When you're done, a test can render `<OrderSummary now={fixedNow} random={fixedRandom} />` and get
the exact same output on every run, and render `<OrderSummary loadOrder={stubLoader} />` to see
any order data it wants — all without reading a single line of your implementation.
