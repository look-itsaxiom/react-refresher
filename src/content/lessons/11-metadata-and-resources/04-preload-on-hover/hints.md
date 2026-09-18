`preload` lives in `react-dom`, not `react`: `import { preload } from 'react-dom';`.
---
Add `onMouseEnter` to each `<a>`. Inside it, call `preload` — you don't need `useState`
or any React re-render for this to work, it's a direct call to the browser/React
resource cache.
---
`preload(`/images/${product.id}.jpg`, { as: 'image' })` — the second argument's `as`
tells the browser what kind of resource this is so it prioritizes and caches it
correctly.
---
Each `<li>` maps over `PRODUCTS`, so the handler needs to close over that iteration's
`product`, the same way the existing `href` does.
