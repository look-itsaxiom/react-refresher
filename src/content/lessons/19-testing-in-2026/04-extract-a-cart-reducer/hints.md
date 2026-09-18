Separate the two questions `Cart` is currently answering in the same tangle of `useState` calls:
"what should the cart's data look like after this action" (a pure state transition) and "what
numbers should the page show" (a pure calculation from that data). Neither needs a component, a
render, or a DOM to get right — that's exactly why they're worth pulling out and testing directly.

---

`cartReducer` is a plain reducer function, no different from any `(state, action) => newState`
you've written before:

```ts
export type CartItem = { id: string; name: string; price: number; qty: number };
export type CartState = { items: CartItem[]; couponPercent: number };
export type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; id: string }
  | { type: 'applyCoupon'; percent: number };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': /* merge qty if the id exists, otherwise append */
    case 'remove': /* filter by id — an id that isn't present just filters out nothing */
    case 'applyCoupon': /* set couponPercent */
  }
}
```

The bug in the starter's `removeItem` was reaching for `findIndex` + `splice`, which needs a
special case for "not found." `Array.prototype.filter` doesn't have that failure mode at all —
it's the right tool specifically because there's no index to get wrong.

---

For `selectTotals`, work in cents everywhere and only convert back to dollars at the very end:

```ts
export const COUPON_MAX_DISCOUNT = 5; // dollars

export function selectTotals(state: CartState) {
  const subtotalCents = state.items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.qty,
    0,
  );
  const rawDiscountCents = Math.round((subtotalCents * state.couponPercent) / 100);
  const discountCents = Math.min(rawDiscountCents, Math.round(COUPON_MAX_DISCOUNT * 100), subtotalCents);
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: (subtotalCents - discountCents) / 100,
  };
}
```

Then in `Cart`, swap the `useState` pair for `const [state, dispatch] = useReducer(cartReducer, initialState)`,
and derive `{ subtotal, discount, total }` from `selectTotals(state)` instead of computing them
inline. The buttons just need to `dispatch({ type: 'add', item: ... })` and so on — the JSX
structure, button labels, and headings can stay as they are.
