Find the three places the component reaches directly for something non-deterministic or external:
`Date.now()` for the delivery date, `Math.random()` inside the promo code generator, and the order
loader called inside `useEffect`. Each one wants to become a parameter with a default — the
default is the real behavior, so production code is unaffected.

---

Define a props type and destructure with defaults, the same way you'd give any function an
optional parameter:

```tsx
type OrderSummaryProps = {
  now?: () => number;
  random?: () => number;
  loadOrder?: () => Promise<Order>;
};

export default function OrderSummary({
  now = Date.now,
  random = Math.random,
  loadOrder = defaultLoadOrder,
}: OrderSummaryProps) {
  // ...
}
```

Pass `now` and `random` down into whatever helper functions compute the delivery date and promo
code, instead of having those helpers call the globals directly. Put `loadOrder` in the effect's
dependency array (it's stable by default since it's the same function reference every render
unless a test passes a new one).

---

For the markup: a `<h2>` (or `<h1>`, either is a fine `heading` role) containing the order id
covers the "findable by role" requirement for the title. A `<table>` with a `<thead>` row of
`<th scope="col">` cells and one `<tr>` per item (using `<th scope="row">` for the item name and
`<td>` for quantity and price) gives you `getByRole('table')` and `getByRole('row')` for free —
you don't need any `data-testid`. The total, delivery date, and promo code can be plain
`<p>` text; a test that needs them can use `getByText` with a regex.
