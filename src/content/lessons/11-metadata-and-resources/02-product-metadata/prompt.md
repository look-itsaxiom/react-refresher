This product page sets the tab title and a description meta tag the old way: a
`useEffect` that mutates `document.title` and manually appends a `<meta>` element,
with no cleanup.

That has two bugs. Switch products and the description accumulates rather than
replaces (both meta tags exist at once — nothing removed the old one). Unmount the
page and the title and the meta tag are left behind, stuck describing a product page
that no longer exists.

Rewrite `App` to render `<title>` and `<meta>` directly instead of touching `document`
in an effect:

- Render a `<title>` inside the component whose text is `"<name> · Store"`.
  **`<title>` only hoists when it has a single string child** — build the full string
  first (e.g. with a template literal) and pass that one value as the child, rather than
  writing `<title>{product.name} · Store</title>`, which passes two children and won't
  hoist correctly.
- Render `<meta name="description" content={...} />` with a description that includes
  the product's name.
- Delete the `useEffect` and the manual DOM calls entirely — you should not need
  `useEffect` when you're done.
- Keep the visible `<h1>{product.name}</h1>` and the "Switch product" button that's
  already there.

When you're done, switching products should update the title and meta with no stale
duplicates, and unmounting the page should remove both tags from `document.head`.
