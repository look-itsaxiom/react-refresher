# Metadata belongs to the component

Before React 19, `<title>` and `<meta>` lived in one place — usually `index.html` or a
`react-helmet`/`react-helmet-async` call — because rendering a `<title>` tag inside a
component tree did nothing useful: it rendered a literal `<title>` element wherever it
sat in the DOM, not inside `<head>`. Helmet worked around that with its own portal and
its own dedupe logic, running as a side effect after render.

React 19 makes this native. Render `<title>`, `<meta>`, or `<link>` (non-stylesheet)
anywhere in your tree, and React hoists it into `document.head` during commit, wherever
that head actually lives — the main document, a shadow root, or an iframe:

```tsx
function ProductPage({ product }: { product: Product }) {
  return (
    <article>
      <title>{`${product.name} · Store`}</title>
      <meta name="description" content={product.summary} />
      <h1>{product.name}</h1>
    </article>
  );
}
```

No effect, no manual `document.title = …`, no cleanup function. The tag is now data
that flows with props and state like anything else you render.

**Gotcha:** `<title>` only hoists when its `children` is a single string (or number).
`<title>{product.name} · Store</title>` looks reasonable but actually passes `title`
*two* children — the expression and the string literal — and React silently declines to
treat that as metadata: it renders an empty `<title>` in place instead of hoisting real
text. Build the full string first (a template literal, as above, or a variable) and pass
it as one child. `<meta>` and `<link>` don't have this restriction since their content
lives in attributes, not children — it's specific to `<title>`.

## Deduping and removal are automatic

If two components each render a `<meta name="description">`, React keeps only the last
one committed and removes the other from the DOM — you don't get duplicate tags fighting
each other. `<title>` behaves the same way: whichever `<title>` is rendered "last" (in
commit order) wins, so a page-level default and a route-level override compose without
you writing precedence logic.

Unmounting matters too. When the component that rendered a `<title>` or `<meta>` goes
away — navigating to a route that doesn't render one, or the component unmounting for
any other reason — React removes the tag it inserted. Compare that to the pre-19
pattern of `document.title = '...'` in a `useEffect` with no cleanup: the browser tab
keeps showing stale text (or a stale description in a scraped preview) until something
else overwrites it. This is one of the few cases where "just mutate the DOM in an
effect" is strictly worse than the declarative alternative, not just less idiomatic.

## Why `react-helmet` is no longer necessary

`react-helmet` and `react-helmet-async` existed to solve exactly this problem across the
component tree, plus SSR: collect every `<title>`/`<meta>` rendered during a server
render and serialize them into the `<head>` sent to the client. Both are effectively
frozen projects at this point — `react-helmet-async`'s own docs point adopters at
React 19's built-in support. If you're starting a project in September 2026, there is no
reason to add either dependency for this use case. You'll still see them in code you
inherit; migrating means deleting the `<Helmet>` wrapper and rendering the same tags
directly.

## Streaming SSR: metadata still arrives before the images

The historical argument for a head-management library was SSR: you need the `<title>`
decided before the browser starts painting, and streaming makes "before" fuzzy since HTML
arrives in chunks. React's built-in metadata support is stream-aware — when `<title>` and
`<meta>` are rendered by a component deep in a Suspense boundary that resolves during the
initial server render (not one that's still pending when the shell flushes), React still
places them in `<head>` in the streamed output, ahead of the boundary's own content. You
get the SEO- and social-preview-relevant behavior without picking a library.

## What frameworks add on top

The built-in support is per-component and imperative-free, but large apps still want a
single declared answer to "what is this route's title" that's checkable at build time.
Frameworks layer that on top rather than replacing the mechanism:

- **Next.js** (App Router) has you export a `metadata` object or `generateMetadata`
  function per route segment; Next merges parent and child metadata and renders the
  resulting tags for you. Under the hood, on the client it still relies on the same
  React capability described here.
- **React Router 8** (formerly Remix's data APIs) has a route-level `meta` function that
  returns an array of tag descriptors, merged across nested routes.

Reach for one of those conventions when you have real nested-route metadata inheritance
to manage. For a single component that needs to own its own title and description —
most product pages, most modals — rendering `<title>`/`<meta>` directly is simpler and
is what those frameworks do internally anyway.

## Further reading

- [react.dev — `<title>`](https://react.dev/reference/react-dom/components/title)
- [react.dev — `<meta>`](https://react.dev/reference/react-dom/components/meta)
- [react.dev — Resource and metadata components overview](https://react.dev/reference/react-dom/components#resource-and-metadata-components)
- [Next.js — Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
