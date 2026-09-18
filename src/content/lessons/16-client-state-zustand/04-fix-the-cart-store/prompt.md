This cart store (built on the working `create` from the previous exercise, provided below
already correct — don't change it) has two of the anti-patterns from the last concept
step.

1. **It duplicates server data.** `CATALOG` stands in for product data your app already
   fetched elsewhere (think: a TanStack Query result). Each cart line still copies a
   product's `name` and `price` into its own `CartItem` instead of storing only `id` and
   `quantity` and looking the rest up in `CATALOG` when needed.
2. **It stores derived data.** `total` is a field on the state, kept in sync by hand.
   `addItem` updates it correctly, but `removeItem` forgets to — remove a line and the
   total on screen stays wrong until the next add.

There's also a small `persist`-like middleware already wired up (`createCartStore` takes a
`storage`), so the cart survives a "reload" — modeled here as calling `createCartStore`
again with the same storage, the way a real page load re-runs your module against
`localStorage`.

Fix both anti-patterns:

- Change `CartItem` to `{ id: string; quantity: number }` — no `name` or `price` on it.
- Delete `total` from the state entirely. Export a `selectTotal` selector that computes it
  from `items` and `CATALOG` on demand.
- Update `CartLines` to look up each line's name and price from `CATALOG` by `id`.
- Update `CartTotal` to read `selectTotal` through the store instead of a stored field.

Keep the exported names (`CATALOG`, `createCartStore`, `createInMemoryStorage`,
`useCartStore`, `selectTotal`) and the `data-testid`s on `CartTotal` (`total`) and the
buttons' accessible names as they are — the checks call through them.
