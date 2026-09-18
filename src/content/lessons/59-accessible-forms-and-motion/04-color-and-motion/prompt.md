Two components, two separate problems.

**`StatusList`** shows each job's status as a colored dot only — no text, no icon shape, and no
accessible name that mentions the status. Fix it so:

- Each item shows a visible text label naming the status ("Queued", "Running", "Failed", "Done"),
  in addition to the dot — color is reinforcement, not the only signal.
- The status word has to be *that item's* text, not just present somewhere on the page — a screen
  reader user reading one list item linearly needs the status word inside it, right next to the
  job name it belongs to.

**`Announcement`** slides in with a CSS animation no matter what the user's OS motion preference
is. Fix it so the animation is gated on a `prefers-reduced-motion` check that a test can control
without touching real OS or browser settings:

- Write `useReducedMotion(matchMedia)`, a hook that takes a function shaped like
  `(query: string) => MediaQueryList` (that's what `window.matchMedia` is) and returns whether
  `'(prefers-reduced-motion: reduce)'` currently matches.
- Default the parameter to `window.matchMedia` when it exists, and return `false` when it
  doesn't (jsdom has no `matchMedia` — treat "can't tell" as "don't assume the user wants less
  motion" rather than throwing).
- Subscribe to changes: if the user (or, in a test, a stub) flips the preference while mounted,
  the hook's return value should update, not just reflect whatever it was on first render.
- `Announcement` should accept an optional `matchMedia` prop, pass it to the hook, and set
  `data-motion="reduced"` on its `role="status"` container when the hook returns `true`, or
  `data-motion="full"` when it returns `false`. Use that attribute to gate the CSS animation
  (full motion runs the slide-in keyframes; reduced motion applies a plain fade or nothing).

`useReducedMotion` and `Announcement` both need to be named exports (not just used internally) —
that's how the checks reach them without needing real browser media APIs.
