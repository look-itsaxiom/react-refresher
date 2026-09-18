# Stylesheets and resource hints

`<title>` and `<meta>` are metadata: React hoists them and otherwise stays out of the
way. Stylesheets and scripts are different — they have loading order and cascade rules
that matter for correctness, so React 19 gives them their own semantics rather than just
moving the tag.

## `precedence` turns stylesheet order into a declared fact

Render a stylesheet link anywhere in the tree:

```tsx
function Card() {
  return (
    <>
      <link rel="stylesheet" href="/card.css" precedence="default" />
      <div className="card">…</div>
    </>
  );
}
```

Without `precedence`, a `<link rel="stylesheet">` you render is just a DOM node in
document order — same as writing it in `index.html`, so a component mounted later can
end up after (and override) a sibling's CSS for reasons that have nothing to do with the
styles themselves. `precedence` tells React "this sheet belongs to this named group";
React then:

1. **Orders sheets by precedence group, not by render/mount order.** Declare precedence
   groups once (e.g. `"reset"`, `"components"`, `"utilities"`) and every stylesheet
   tagged `"components"` ends up after every `"reset"` sheet in the DOM, regardless of
   which component rendered first. This is what makes utility-class overrides reliable
   in a tree where components mount in an unpredictable order.
2. **Dedupes by `href`.** Ten components can all render the same stylesheet link; React
   inserts it once.
3. **Holds the commit until the sheet loads**, for a stylesheet rendered during an
   initial render or inside a Suspense boundary that's still resolving — the same
   mechanism that waits for suspended data, applied to CSS. That's what eliminates a
   flash of unstyled content without you hand-rolling a loading state.

`precedence` with no particular string value is fine — the value itself is just a group
name you invent and reuse consistently within your app.

## `preload`, `preinit`, and friends: telling the browser what's coming

`react-dom` exports functions you call imperatively — from an event handler, a route
loader, anywhere — to give the browser (or React) a resource hint before it's needed by
render:

| Function | DOM equivalent | Behavior |
|---|---|---|
| `prefetchDNS(href)` | `<link rel="dns-prefetch">` | Resolve DNS for a host you'll hit soon. Cheapest hint; use for third-party origins you're not ready to connect to yet. |
| `preconnect(href)` | `<link rel="preconnect">` | DNS + TCP + TLS handshake ahead of time. Use when you know you're about to fetch from that origin (e.g. an image CDN) within the next moment. |
| `preload(href, { as })` | `<link rel="preload" as="...">` | Fetch a resource into the cache without doing anything with it yet — the resource is used later by a normal `<img src>`, `<link rel="stylesheet">`, etc. |
| `preinit(href, { as: 'style' \| 'script' })` | `<link rel="stylesheet">` / `<script>` inserted eagerly | Fetch **and immediately apply/execute**. Use when you want the stylesheet active or the script run now, not just cached. |
| `preloadModule` / `preinitModule` | `<link rel="modulepreload">` | Same pair, for ES modules — preload just fetches, preinit fetches and evaluates. |

The `preload` vs `preinit` distinction is the one people get backwards: `preload` is a
hint for something you'll render through normal JSX shortly (so when that `<link
rel="stylesheet">` or `<img>` shows up, the browser already has the bytes); `preinit` is
for something you want in effect immediately, called imperatively instead of rendered.
A common pattern is calling `preload` for an image on hover — before the user clicks
into a detail view that will render it — so the `<img>` paints from cache instead of
a warm network fetch:

```tsx
<a
  href={`/products/${id}`}
  onMouseEnter={() => preload(`/images/${id}.jpg`, { as: 'image' })}
>
  {name}
</a>
```

All of these are **hints**. React and the browser dedupe repeated calls with the same
`href` (calling `preload` for a resource twice, or preloading something that's about to
be rendered with `precedence` anyway, is a harmless no-op), and none of them block
rendering the way a suspending stylesheet does — they fire and React moves on.

## Where this fits with the rest of the performance story

These APIs don't replace `<link rel="preload">` written directly in `index.html` for
resources known before any JavaScript runs (a critical font, the LCP hero image) — that
static hint still fires earliest and is still the right tool for "this resource must
start loading immediately." `react-dom`'s versions are for resources whose need is
discovered by application logic: a route you're about to navigate to, a card the user is
hovering, an image whose URL depends on data you just fetched. Use both together rather
than picking one.

## Further reading

- [react.dev — `<link>`](https://react.dev/reference/react-dom/components/link)
- [react.dev — `preload`](https://react.dev/reference/react-dom/preload)
- [react.dev — `preinit`](https://react.dev/reference/react-dom/preinit)
- [react.dev — Resource preloading APIs overview](https://react.dev/reference/react-dom/preconnect)
- [web.dev — Resource hints (`preconnect`, `dns-prefetch`, `preload`)](https://web.dev/articles/preconnect-and-dns-prefetch)
