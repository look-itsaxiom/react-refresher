# Layout, motion, and color without JS

A lot of what used to require a `ResizeObserver`, a scroll listener, or a client-side color library
is now a CSS feature. The theme here is the same across all of it: push state that's really about
rendering out of `useEffect` and into the browser's own layout/paint pipeline.

## Container queries

```css
.card-grid { container-type: inline-size; }

@container (min-width: 28rem) {
  .card { grid-template-columns: 8rem 1fr; }
}
```

A media query only ever knows the viewport. A container query sizes an element by its *containing
block* — so the same `<Card>` can be one column in a narrow sidebar and two columns in a wide main
area, with no JS measuring anything. `container-type: inline-size` opts an element into being a
query container for its descendants; `@container` then queries that ancestor's size, not the
viewport's. Container query length units (`cqw`, `cqi`, `cqh`, `cqb`) let a descendant size itself
relative to the container instead of the viewport, too. Cross-engine support completed in February
2023; Baseline widely available since 2024. Tailwind v4 ships `@container` variants (`@lg:grid-cols-2`)
as core utilities, no plugin needed.

## Subgrid

```css
.card { display: grid; grid-template-columns: subgrid; grid-column: span 3; }
```

Ordinarily a nested grid can't align its tracks with its parent's — a card's internal columns drift
out of alignment with the cards around it unless you duplicate the parent's `grid-template-columns`.
`subgrid` tells a grid item to adopt its parent's tracks directly. Chrome shipped it last, in
September 2023, so it's Baseline widely available now — safe to reach for.

## `:has()` for state, without state

```css
.field:has(input:invalid) .error-text { display: block; }
.list:has(:checked) .bulk-actions { visibility: visible; }
```

Validation styling, "show a toolbar when anything is selected," a sidebar layout that changes when
a checkbox toggle is checked — all of this used to mean lifting state into a component and
re-rendering. `:has()` reads the DOM's actual condition directly in CSS. It's not a replacement for
state that drives *behavior*, only for state that drives *appearance*.

## Entry/exit without a library: `@starting-style`

Transitioning `display: none` to visible, or animating something in on first mount, used to need a
library because you can't transition to/from `display: none` or animate a property change that
happens in the same frame an element is inserted. Two additions fix this together:

```css
dialog {
  transition: opacity 0.3s, display 0.3s allow-discrete;
  opacity: 1;

  @starting-style {
    opacity: 0;
  }
}

dialog:not([open]) {
  opacity: 0;
  display: none;
}
```

`@starting-style` defines the "before" state for a transition on an element's first frame.
`transition-behavior: allow-discrete` lets a normally non-interpolatable property like `display` or
`content-visibility` participate in a transition, switching at the midpoint instead of instantly.
Cross-browser support completed in mid-2024 (Firefox 129); Baseline newly available.

## Scroll-driven animation: use with a fallback

```css
@keyframes reveal { from { opacity: 0; translate: 0 2rem; } }
.card {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
```

`animation-timeline: scroll()` or `view()` ties an animation's progress to scroll position instead
of wall-clock time — a reveal-on-scroll effect with zero JS and zero scroll-listener jank. Safari
shipped it in September 2025 (Safari 26); Chrome/Edge have had it since 2023. **Firefox still ships
it behind a flag as of mid-2026** and it's a named Interop 2026 focus area, so this is not yet
Baseline. Use it as progressive enhancement — write it so an animation simply not running is an
acceptable fallback, not a broken layout.

## The View Transitions API, and React's `<ViewTransition>`

```js
document.startViewTransition(() => {
  // DOM mutation whose before/after states should crossfade/morph
  updateDOM();
});
```

The browser snapshots the before and after state and generates a transition between them
automatically, `view-transition-name` lets you tag specific elements for a shared-element morph
(a thumbnail growing into a detail view) instead of a plain crossfade. Same-document view
transitions reached Baseline in October 2025. React 19.3 (September 2026) shipped `<ViewTransition>`
as a stable component that wraps this API: wrap the part of the tree whose enter/exit/move/resize
should animate, and any DOM change caused by a Transition-wrapped update animates automatically,
including coordinating with Suspense so a fallback-to-content swap animates instead of popping in.
Cross-document (multi-page) view transitions — animating an actual navigation — are Baseline-tracked
but still Chromium-only in practice; treat them as an enhancement for MPAs, not something to depend
on.

## Color: spaces and functions built for editing, not just storage

```css
:root {
  --accent: oklch(65% 0.15 250);
  color-scheme: light dark;
}
.btn:hover { background: color-mix(in oklch, var(--accent), white 20%); }
.btn-muted { background: rgb(from var(--accent) r g b / 0.5); }
body { background: light-dark(white, #14171e); }
```

`oklch()`/`oklab()` are perceptually uniform color spaces — lightening or rotating hue in `oklch`
doesn't shift perceived saturation the way it does in `hsl`, so a generated color scale actually
looks evenly spaced. `color-mix()` blends two colors in a given space without a JS color library.
Relative color syntax (`rgb(from var(--accent) ...)`) derives a new color from an existing one —
same hue, different alpha — inline, in CSS. `light-dark()` picks between two values based on
`color-scheme`, replacing a pair of `@media (prefers-color-scheme)` blocks with one line. All of
these completed cross-engine support in 2023–2024 and are Baseline (`oklch`/`color-mix` widely
available; relative color syntax and `light-dark()` newly available, given their 2024 completion
dates).

## A few more worth knowing

- **`text-wrap: balance`** evens out line lengths in a heading (Baseline 2024). **`text-wrap:
  pretty`** avoids orphans in body text but Firefox hasn't shipped it as of September 2026 — it's
  progressive enhancement, not Baseline.
- **`field-sizing: content`** lets an `<input>`/`<textarea>` grow to fit its value instead of a
  fixed size plus JS auto-resize. MDN lists it as Baseline 2026.
- **CSS anchor positioning** (`anchor()`, `position-anchor`, `@position-try`) — attach a popover or
  tooltip to a trigger element's edge without a positioning library. It reached Baseline in
  January 2026 with Firefox and Safari 26 catching up to Chrome; new, but usable.

## Interview angle

The posting wants CSS without a framework crutch, and this lesson is the direct evidence for that: a task card in this product needs to look different in a narrow kanban column than in a wide detail panel, and a container query does that off the card's own containing element with zero JS, where the old approach was a `ResizeObserver` and a class toggle. Similarly, "show a bulk-actions toolbar when any task in a list is checked" is a `:has()` selector, not a `useState` plus a `useEffect` watching checkbox state. A strong answer can name why these matter beyond cleverness: state that's really about layout or appearance, kept out of React state, means one less re-render source and one less thing that can drift from the DOM's actual condition.

**Likely follow-up:** You're building a task card that needs a different internal layout in a 300px sidebar than in a 900px main panel, and the surrounding page layout also changes at different breakpoints. Would you reach for a media query, a container query, or both, and why?

**Pitfall:** Defaulting to a `ResizeObserver` or a state-tracking `useEffect` for something that's purely presentational, like a card's layout at a given width or a toolbar's visibility based on descendant state. It works, but it adds a re-render path and a synchronization bug surface that `@container` or `:has()` don't have, since they read the DOM's actual condition directly.

## Further reading (optional)
- [MDN: CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [MDN: `@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)
- [React blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [MDN: `color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
