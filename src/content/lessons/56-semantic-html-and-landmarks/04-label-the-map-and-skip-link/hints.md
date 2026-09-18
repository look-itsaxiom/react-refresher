Add `aria-label="Primary"` to the first `<nav>` and `aria-label="Footer"` to the second. That's
the whole fix for step 1 — no markup changes, just the two attributes.
---
Change the section's `<h3>Related guides</h3>` to `<h2 id="related-heading">Related guides</h2>`,
then add `aria-labelledby="related-heading"` to the `<section>` itself. The `id` and
`aria-labelledby` value have to match exactly.
---
Add `role="list"` to the `<ul className="related-list">`. It already renders as a list in this
environment, but the explicit role is what keeps it a list regardless of the
`list-style: none` some browsers use to drop list semantics.
---
For the skip link: `const mainRef = useRef<HTMLElement>(null);`, then `ref={mainRef}
tabIndex={-1}` on the `<main>`. Give the `<a>` an `onClick={(e) => { e.preventDefault();
mainRef.current?.focus(); }}` — `preventDefault` stops the default fragment-scroll behavior so
your explicit `.focus()` call is what actually moves focus.
