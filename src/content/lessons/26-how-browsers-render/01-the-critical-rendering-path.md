# The critical rendering path

The previous lesson ended at first byte: bytes are arriving over the wire. This one picks
up from there — what the browser does with those bytes before anything shows up on
screen, and what keeps redoing that work expensive enough to matter for how you write
components.

## HTML parsing is streaming, and it starts a second parser early

The HTML parser is incremental: it doesn't wait for the whole document before building
the DOM. As bytes arrive, it tokenizes and appends nodes, which is why a large HTML
response can start rendering before it finishes downloading. Alongside the main parser,
the browser runs a **preload scanner** — a lookahead parser that skims the raw markup for
`<img>`, `<link rel="stylesheet">`, `<script src>`, and preload hints, and fires off those
network requests immediately, without waiting for the main parser to reach that point in
the tree or for CSS/JS execution to resolve. This is why moving a critical image or font
into a `<link rel="preload">` in `<head>` helps even though the browser would "find" it
anyway a few hundred milliseconds later: the preload scanner already found it, the
`preload` just raises its priority.

## Two blocking behaviors that aren't the same thing

- **CSS is render-blocking.** The browser withholds the first paint until it has the full
  CSSOM (CSS Object Model), because rendering with incomplete styles would mean visibly
  repainting once the rest arrives — so by default, no `<link rel="stylesheet">` in the
  document means no pixels. `media="print"` or non-matching `media` queries don't block.
- **A classic `<script>` is parser-blocking**, not just render-blocking: hitting a
  synchronous script tag pauses HTML parsing entirely, because the script might call
  `document.write()` and change what comes next. It also waits for any CSS above it to
  load first, since the script might read computed styles. `async` breaks the ordering
  guarantee entirely — it downloads in parallel and executes the instant it's ready,
  interrupting the parser whenever that happens. `defer` (and `type="module"`, which is
  deferred by default) downloads in parallel but executes only after parsing finishes, in
  document order, before `DOMContentLoaded`. For anything that doesn't need to run before
  first paint — most application code — `defer`/`type="module"` is the default you want;
  reach for `async` only for independent scripts with no ordering dependency (analytics,
  some third-party widgets).

## DOM + CSSOM → render tree → layout → paint → composite

Once both trees exist, the browser combines them into a **render tree**: DOM nodes with
their computed styles, skipping anything with `display: none` (present in the DOM,
absent from the render tree — `visibility: hidden` stays in the render tree and still
takes up space). From there:

1. **Layout (reflow).** The browser walks the render tree and computes the exact
   geometry — position and size in pixels — for every box, given the viewport. Layout is
   inherently a whole-tree-ish operation: a size change in one box can shift boxes around
   it, which is why it's usually the most expensive stage.
2. **Paint.** The browser records the actual drawing instructions per element — fill this
   rectangle, draw this text, this box-shadow — for its resolved geometry.
3. **Composite.** Elements that need to be handled separately (their own **layer** — a
   `transform`, `opacity` change slated for animation, `will-change`, `position: fixed`
   with certain conditions, video, canvas) are rasterized independently and combined by
   the compositor, often on the GPU. Compositing without re-painting is why animating
   `transform`/`opacity` is close to free compared to animating `top`/`left`/`width`: the
   former only asks the compositor to redraw a texture in a new position, the latter
   forces layout and paint on every frame.

Not every change re-runs every stage. Changing `color` triggers paint + composite but
skips layout, since geometry didn't move. Changing `width` triggers all three. Changing
only `transform`/`opacity` on a layer with `will-change: transform` (or one the browser
already promoted) can skip layout and paint entirely and go straight to composite — the
cheapest possible update.

## Forced synchronous layout ("layout thrashing")

Layout is lazy by design: the browser batches style changes and defers recomputing
geometry until it actually needs an answer — the next paint, or when your JS *asks* for a
layout-dependent value (`getBoundingClientRect()`, `offsetHeight`, `offsetTop`,
`scrollTop`, `getComputedStyle()` for certain properties). Reading one of those properties
right after writing a style forces the browser to flush the pending style change and run
layout synchronously, on the spot, so it can hand back a value that reflects it — a
**forced synchronous layout**. Do that inside a loop — write, read, write, read, once per
list item — and you pay for a full layout recalculation on every iteration instead of once
for the whole batch. This is layout thrashing, and it's one of the most common causes of
janky-feeling list/drag/resize code. The fix is always the same shape: batch every read
first, then batch every write, so the browser only has to flush layout once (if at all) to
answer the reads, and the writes queue up for the next natural paint.

React's own DOM operations don't save you here — this is about *your* code reading layout
geometry (a ref's `getBoundingClientRect()`, for instance) interleaved with style writes
inside the same event handler or effect. React batches its own commits, but it can't see
into an arbitrary synchronous read you wrote in an effect body.

## Watching this in DevTools

Chrome DevTools' **Performance** panel timeline shows this pipeline directly: purple
blocks are `Layout` (reflow), green blocks are `Paint`, and a bar labeled
`Recalculate Style` shows CSSOM/style recomputation. A red-flagged `Layout` entry with a
warning icon marks a forced synchronous layout, often labeled "Forced reflow" with a
stack trace pointing at the exact line that read a layout property. The **Rendering** tab
(Cmd/Ctrl+Shift+P → "Show Rendering") has a "Layout Shift Regions" and "Paint flashing"
overlay that highlights, live, which regions just repainted or shifted — useful for
spotting unnecessary paint work that has nothing to do with what you just changed.

## Further reading (optional)

- [web.dev — Populating the page: how browsers work](https://web.dev/articles/howbrowserswork)
- [web.dev — Avoid large, complex layouts and layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- [MDN — Critical rendering path](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
- [web.dev — `content-visibility`: the new CSS property that boosts your rendering performance](https://web.dev/articles/content-visibility)
