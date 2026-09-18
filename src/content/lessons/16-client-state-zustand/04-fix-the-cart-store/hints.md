Start with `total`. Delete the field from `CartState` and from the object `addItem`
returns to `set`. Write a plain function `selectTotal(state)` that sums
`CATALOG[item.id].price * item.quantity` across `state.items` — it doesn't need to touch
`set` or `get` at all, it's just a function of the state.
---
`CartTotal` currently does `useCartStore((s) => s.total)`. Once `total` is gone, pass
`selectTotal` itself as the selector: `useCartStore(selectTotal)`. Since it's a plain
function of `state`, `useCartStore` doesn't care where it came from.
---
For the duplication: change `CartItem` to `{ id: string; quantity: number }`, drop `name`
and `price` from both branches of `addItem`'s `items` update, and in `CartLines` look up
`CATALOG[item.id]` to get the `name`/`price` to display instead of reading them off the
item.
---
Removing a field from `CartState` means `removeItem` no longer has anything to forget —
its body doesn't need to change at all once `total` is gone from the type and the initial
state object.
