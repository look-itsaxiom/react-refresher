This product list links to a detail page that renders a large hero image. Right now
the image only starts downloading once the user actually navigates, so the detail view
sits on a blank space until the fetch finishes.

Warm the cache before that happens: when the user hovers a product link, call
`preload` from `react-dom` for that product's image.

- Import `preload` from `react-dom`.
- In the link's `onMouseEnter` handler, call `preload(imageHref, { as: 'image' })`
  where `imageHref` is `` `/images/${product.id}.jpg` ``.
- Do this for every product link, not just the first.
- Leave the rest of the component (the list, the hrefs) as it is.

You're not rendering an `<img>` here — `preload` is an imperative call that hints the
browser to start fetching a resource that will be used shortly, so the byte are already
cached by the time the real `<img>` (on the page you'd navigate to) asks for them.
