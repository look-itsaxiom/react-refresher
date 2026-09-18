This product card grid is laid out with a fixed number of columns and has no responsive behavior of
its own — it just inherits whatever grid the page around it happens to have. Make the grid itself
responsive to *its own* available width (it might render in a wide main column or a narrow sidebar),
and make an individual card react to whether it has an image, using CSS alone. The sandbox here
doesn't execute `@container`/`:has()`/`@layer` (jsdom's CSS engine doesn't implement them), so this
exercise is graded by reading the CSS text you write, not by rendered layout — write real, valid
CSS and it will pass.

Edit only the `<style>` tag's contents. Do not change the JSX structure, class names, or the
`data-testid` attributes.

1. Make `.card-grid` a query container for its own inline size: add `container-type: inline-size;`
   to its rule.
2. Add an `@container` rule with a `(min-width: ...)` condition that changes `.card`'s
   `grid-template-columns` to two columns when the container is wide enough (any width you choose,
   e.g. `28rem`).
3. Add a `.card:has(img)` rule that changes something about a card's layout when it contains an
   image (for example, set its `grid-template-columns` to reserve space for the image).
4. At the top of the stylesheet, declare a layer order with `@layer reset, components;` (you don't
   have to put any rules inside those layers for this exercise — just declare the order).

Keep the CSS small — a few short rules is enough to satisfy all four requirements.
