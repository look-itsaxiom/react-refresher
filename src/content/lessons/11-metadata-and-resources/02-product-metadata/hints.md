React 19 hoists `<title>` and `<meta>` rendered anywhere in your tree into `document.head`
automatically. You don't need `useEffect`, a ref, or a portal — just render the tags.
---
Replace the whole `useEffect` block with a `<title>` rendered directly in the JSX
returned by `App`. Build the text as one string first —
``<title>{`${product.name} · Store`}</title>`` — because `<title>` only hoists a single
string child; splitting it into an expression plus a literal (`{product.name} · Store`)
gives it two children and it won't hoist.
---
`<meta name="description" content={...} />` works the same way — render it as JSX, next
to `<title>`, with `content` built from `product.name` like the effect version did.
---
You should end up with no `useEffect` import at all. If two components ever render
competing `<title>`s, React keeps the latest one and removes the other — you get that
for free, so don't add any manual dedupe logic.
