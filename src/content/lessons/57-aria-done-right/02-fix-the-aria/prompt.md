This notifications panel toggles open and closed, and has a mute switch inside it. It "works" if
you click precisely on the right pixels with a mouse — everything else about it is wrong. Open
Chrome DevTools' Accessibility pane on it and you'll see the problems directly: no state changes
on the toggle, a switch announced as a plain button, a name that never reaches the accessibility
tree, and one attribute doing nothing at all.

Fix all of it in `App.tsx`, without changing the visual layout, class names, or text:

1. **The panel toggle.** `Notifications` is currently a `<div role="button">` — unreachable by
   keyboard, and its `aria-expanded` state never updates because there isn't one. Replace it with
   a real `<button>`, add `aria-expanded` (kept in sync with whether the panel is open), and
   `aria-controls` pointing at the panel's `id`.
2. **The panel itself.** Give the panel a real `id` (matching the toggle's `aria-controls`) and a
   role and accessible name a screen reader can announce as a region — `role="region"` with
   `aria-label="Notifications"` works.
3. **The mute switch.** It's a `<div role="button">` with `aria-checked` already on it — a switch
   wearing the wrong role, and a `<div>` instead of a focusable element. Make it a real
   `<button role="switch">`, and give it an accessible name by connecting it to the visible
   "Mute" text via `aria-labelledby` (the `aria-label` on that text currently does nothing —
   `aria-label` has no effect on a plain, roleless `<div>`, which is exactly why it needs
   replacing rather than keeping).
4. **The dismiss button.** `Dismiss all` is already a real `<button>` — remove the redundant
   `role="button"` sitting on it; it adds nothing and it's the kind of leftover a future review
   should flag.

You shouldn't need any new imports. Every fix is a tag, a role, or an ARIA attribute on markup
that's already there.
