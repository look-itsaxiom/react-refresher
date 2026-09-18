Wrap each header's `<button>` in an `<h3>` (the button itself carries the click behavior and `aria-expanded`/`aria-controls`; the heading exists so screen reader users can jump between questions with heading navigation too).
---
Keep every panel mounted and give it `hidden={!open}` instead of `{open && <div>...</div>}`. That's what lets a check find it via `getByRole('region', { hidden: true })` even while collapsed, and it's what "toggle visibility" means for a `role="region"` in this pattern.
---
Use `useId()` per `FaqItem` for the button's `id` and the panel's `id`, and connect them with `aria-controls` (on the button) and `aria-labelledby` (on the panel).
---
Track open panels with a `Set<number>` rather than a single `number | null` — that's what makes "more than one open at once" the natural default. Toggling means adding/removing that index's membership, not replacing the whole set (unless `singleOpen` is true).
---
Keep an array of button refs (`useRef<(HTMLButtonElement | null)[]>([])`, filled via a callback ref per button) so a single keydown handler can call `.focus()` on a *different* button's real DOM node. Clamp the target index with `Math.max(0, Math.min(index, FAQS.length - 1))` so `Home`/`End`/overshooting an arrow key at either end doesn't throw.
