# Observers and navigation

Before observers, "did this element enter the viewport" or "did this element resize"
meant a scroll or resize listener plus `getBoundingClientRect()` on every tick — a
main-thread poll dressed up as an event handler. The observer APIs move that work off the
critical path: the browser tells you when something changed, computed during its own
layout pass, batched and delivered asynchronously.

## IntersectionObserver

`new IntersectionObserver(callback, options)` watches one or more elements and calls
`callback(entries)` when their intersection with a *root* (the viewport, by default)
crosses a threshold. It's the standard tool for lazy-loading images and components,
infinite scroll (observe a sentinel at the bottom of the list), and visibility analytics
("was this ad actually seen"). Two options do most of the work: `rootMargin` grows or
shrinks the root's bounding box before intersection is computed — `rootMargin: '200px'`
fires the callback 200px before an element would actually be visible, so you can start
loading before the user scrolls there — and `threshold` (0 to 1, or an array) sets what
fraction of the target must be visible before the callback fires; `threshold: 0.5` means
"at least half the element is in view." Every entry in the callback carries
`isIntersecting`, `intersectionRatio`, and `boundingClientRect`, so you rarely need to
re-measure anything yourself. Always `disconnect()` the observer when the component
unmounts — an observer holds a reference to its target and keeps notifying a dead
component otherwise.

## ResizeObserver

`new ResizeObserver(callback)` watches an element's own box size, independent of the
window resizing — a sidebar collapsing, a flex sibling growing, a font finishing its load
and reflowing text all trigger it. This is the primitive behind *container queries* done
in JS: a card component that needs to switch its own layout based on its own width, not
the viewport's, reads that width from `ResizeObserver` instead of `matchMedia`. (For pure
CSS layout, prefer the native
[CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
now that they're broadly supported — reach for `ResizeObserver` when the response to a
size change is a JS decision, like re-virtualizing a list, not just a style swap.) The
one gotcha worth knowing by name: if your resize callback itself changes something that
triggers another resize of the observed element (common when a callback sets `width` or
`height` inline), the browser throws a benign-but-noisy `ResizeObserver loop completed
with undelivered notifications` error. It's not a bug in your logic breaking anything —
it's the browser protecting itself from an infinite observation loop — but it means "don't
resize the thing you're observing from inside its own callback."

## MutationObserver

`new MutationObserver(callback)` watches DOM tree changes: attributes, child list,
character data. It predates the other observers and its legitimate uses in a React app
are narrow, because React itself already tells you when its own tree changes — reaching
for `MutationObserver` on a React-managed subtree is almost always a sign you should be
using a ref callback or effect instead. Where it still earns its place: watching DOM that
*isn't* yours — a third-party widget injecting content, a rich-text `contenteditable`
region, or detecting when a browser extension mutates the page.

## PerformanceObserver

`new PerformanceObserver(callback).observe({ type, buffered })` subscribes to performance
entries as they're recorded, instead of polling `performance.getEntries()`. It's how
Core Web Vitals libraries capture Largest Contentful Paint, layout shifts, and long tasks
without missing entries that happened before you started listening (`buffered: true`
replays anything already recorded). We'll go deeper on this in the performance track —
for now, know it's the observer to reach for when you need paint or layout timing rather
than element geometry.

## The Navigation API

The History API (`pushState`/`popState`) was never designed for SPA routing — it has no
concept of "navigation in progress," no way to intercept and cancel a navigation, and no
built-in async handling, which is why every router built a state machine on top of it.
The [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
replaces that scaffolding: `navigation.navigate(url)` returns a promise; the `navigate`
event fires for *every* navigation (link click, back/forward, `navigate()` call) and lets
you call `event.intercept({ handler })` to run your own async routing logic and control
exactly when the navigation is considered complete; `navigation.currentEntry` and
`navigation.entries()` expose the full session history as data, something the History API
never offered. It reached Baseline "Newly available" in early 2026 — Chrome and Edge have
shipped it for a while, Firefox added it in version 147, and Safari shipped it in 26.2 —
so it's now supported across all major engines. In practice you'll meet it through a
router (React Router, Next.js) that's adopted it under the hood rather than calling it
directly, but recognizing `navigate`/`intercept` in a stack trace or a router's source is
worth being able to place.

## Page visibility and unload

`pagehide` (and, less reliably, `beforeunload`) plus the
[Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)'s
`visibilitychange` event are the pair to know for "flush state before the user leaves."
`document.visibilityState` flips to `'hidden'` when a tab is backgrounded, minimized, or
the OS switches away entirely — this fires reliably on mobile, where `beforeunload` often
doesn't run at all because the OS just kills the process. `pagehide` fires when the page
is actually being torn down or put into the back/forward cache. The practical rule: do
your "save before the user leaves" work — flushing an analytics beacon
(`navigator.sendBeacon`), writing a draft to storage — in `visibilitychange` /
`pagehide`, not `beforeunload`, which is unreliable on mobile and increasingly restricted
because it blocks back/forward cache eligibility.

## Further reading (optional)

- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN: Resize Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
- [MDN: Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
