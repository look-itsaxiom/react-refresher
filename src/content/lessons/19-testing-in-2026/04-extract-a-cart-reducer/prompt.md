`Cart` works when you click through it, but two real bugs are hiding in its tangled `useState`
updates, and neither is easy to catch by clicking:

1. **Removing an item that isn't in the cart corrupts the cart.** `removeItem` finds the item's
   index and splices it out — but when the id isn't found, `findIndex` returns `-1`, and
   `splice(-1, 1)` doesn't no-op, it removes the *last* item in the cart. Clicking "Remove" for an
   item that already disappeared silently deletes something else.
2. **The coupon discount has no cap and no rounding.** The business rule is: a coupon discount
   can never exceed **$5.00**, no matter how large the coupon percentage or the subtotal. The
   current code just multiplies, so a big-enough cart with a big-enough coupon gives away more
   than intended — and the raw floating-point math can drift a fraction of a cent even when the
   cap isn't in play (try adding a $10.10 item and a $20.20 item and inspecting the subtotal before
   it gets rounded for display).

Both bugs are easy to write a test for, and hard to catch by clicking through the UI once. Fix
this by extracting the state logic out of the component:

1. Write `cartReducer(state: CartState, action: CartAction): CartState` handling three actions:
   `{ type: 'add', item }` (merge quantities if the id already exists), `{ type: 'remove', id }`
   (filter it out — a missing id is a no-op), and `{ type: 'applyCoupon', percent }`.
2. Write `selectTotals(state: CartState): { subtotal: number; discount: number; total: number }`.
   Do the money math in integer cents internally (`Math.round(price * 100)`) so floating-point
   drift can't creep in, and cap the discount at $5.00.
3. Rewrite `Cart` to use `useReducer(cartReducer, initialState)` and call `selectTotals(state)` for
   the numbers it displays. **Keep the catalog data (names and prices) and the visible button and
   heading text exactly as given** — you're changing how state is managed, not what the page says.

Export `cartReducer` and `selectTotals` from the module so each can be tested directly, without
rendering anything.
