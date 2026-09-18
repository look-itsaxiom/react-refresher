# Build `canCrossBoundary`

This is a **model** of the check React runs on every prop a Server Component
passes to a Client Component — it's not the real engine (that lives deep in
`react-server`), but the same rules, so you can practice them by making a
function pass or fail values the way React itself would.

Implement `canCrossBoundary(value: unknown): boolean` in `App.tsx`. It should
return `true` for anything that could survive being serialized into an RSC
payload and reconstructed on the client, and `false` for anything that can't.

**Crosses (`true`):**

- Primitives: `string`, `number`, `boolean`, `bigint`, `undefined`, `null`
- A `symbol`, but only if it was registered globally with `Symbol.for(...)`
  (check with `Symbol.keyFor`)
- Plain objects (built with `{}` — prototype is exactly `Object.prototype`)
  and arrays, **as long as every value inside them also crosses**
- `Date`, `Map`, `Set` (check keys and values too), and any `TypedArray` /
  `ArrayBuffer`
- A `Promise`
- A JSX element (anything `React.isValidElement` recognizes)
- A function, but **only** if it's been marked with the given
  `asServerFunction` or `asClientReference` helpers (these stand in for a
  real `'use server'` function or an already-client-side component
  reference — both are legal to hand across the boundary; an ordinary
  function is not)

**Does not cross (`false`):**

- An unregistered symbol (`Symbol('x')`)
- An ordinary, unmarked function
- A class instance (anything whose prototype isn't `Object.prototype`,
  other than the built-ins listed above)
- An object with a null prototype (`Object.create(null)`)
- Any of the above nested inside an otherwise-valid array, object, `Map`, or
  `Set` — one bad value anywhere inside makes the whole thing fail, the same
  way React throws on the first prop it can't serialize

`asServerFunction`, `asClientReference`, and the two marker symbols are
already implemented in the starter — don't change them, just use them (and
use `React.isValidElement` for the JSX case).
