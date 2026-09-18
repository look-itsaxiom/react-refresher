Start with the landmarks: wrap the three nav items in `<nav>` and swap the outer `<div
className="content">` for `<main className="content">`. Keeping the `className` means you don't
need to touch any styling.
---
Turn each nav item into `<a className="nav-link" href="#home">Home</a>` (matching href per
label) instead of a `<div onClick>`. `<a href="...">` is focusable and clickable by default —
you can delete the `onClick` entirely, or keep it, but the `href` is what makes it a real link.
---
Change `<h4>` to `<h2>`. That's the whole fix for the heading hierarchy — no other markup needs
to change.
---
Swap the CTA's `<div className="cta" onClick={...}>` for `<button className="cta"
onClick={...}>`. The `onClick` handler doesn't need to change at all.
---
Give the hero `<img>` a real `alt` describing what it shows (a sentence or short phrase is
enough — the check just requires it to be non-empty). Give the decorative swoosh `<img>`
`alt=""` — an empty string, not omitting the attribute; an image with no `alt` attribute at all
still gets exposed as an unlabeled image.
---
Replace `style={{ opacity: 0 }}` on the internal-build `<p>` with the `hidden` attribute:
`<p hidden>...</p>`. `aria-hidden="true"` works too, but `hidden` also removes it from layout,
which matches what the opacity trick was trying (and failing) to do.
