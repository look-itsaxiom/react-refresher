This page has a landmark list and a heading list that both lie about the page's real structure.
Fix five things in `App.tsx`, without changing any visible text or removing any content:

1. **Name both `<nav>`s.** The page has a primary nav (Home / Pricing / Contact) and a footer nav
   (Privacy / Terms). Right now a screen reader's landmark list shows "Navigation, Navigation" —
   two entries a user can't tell apart. Add `aria-label="Primary"` to the first and
   `aria-label="Footer"` to the second.
2. **Give the `<section>` a name so it becomes a landmark.** The "Related guides" `<section>` has
   no accessible name, so per the HTML accessibility mapping it isn't exposed as a landmark at
   all — a screen reader user can't jump to it. Point `aria-labelledby` at its own heading's `id`
   instead of duplicating the text into an `aria-label`.
3. **Fix the skipped heading level.** The section's heading is an `<h3>`, but the last heading
   before it was the page's `<h1>` — nothing introduced `<h2>`. Change it to `<h2>` (this also
   makes it a valid target for step 2's `aria-labelledby`).
4. **Restore list semantics.** The "Related guides" list has `list-style: none` and, to be
   defensive about the Safari behavior this lesson covers, needs an explicit `role="list"` so its
   list semantics don't depend on which browser is rendering it.
5. **Make "Skip to content" actually move focus.** Right now it's a plain `<a href="#main-content">`
   — clicking it (or activating it from the keyboard) does nothing focus-related in this
   environment, and in a real browser it only scrolls, leaving keyboard focus behind on the link.
   Give the `<main>` a `ref` and `tabIndex={-1}`, and give the link an `onClick` that calls
   `preventDefault()` and moves focus to that `<main>` directly.

Everything you need is already in the markup — no new content, just the right elements and
attributes.
