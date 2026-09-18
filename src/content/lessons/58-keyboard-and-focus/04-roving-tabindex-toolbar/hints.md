Track which button is "active" with a single piece of state, `activeIndex`, starting at `0`. Render `tabIndex={index === activeIndex ? 0 : -1}` on every button — that keeps "exactly one `tabindex=0`" true automatically, for any value `activeIndex` takes.
---
Keep a ref to each button (an array of refs, e.g. `useRef<(HTMLButtonElement | null)[]>([])` filled via a callback ref on each button) so that, on Arrow/Home/End, you can both update `activeIndex` state *and* call `.focus()` on the corresponding button's real DOM node in the same handler — state alone controls `tabindex`, but only `.focus()` moves real focus.
---
Put a single `onKeyDown` on the toolbar container (the element with `role="toolbar"`), not on each button. Handle `ArrowRight`/`ArrowLeft`/`Home`/`End`, and wrap the index with modulo: `(index + TOOLS.length) % TOOLS.length` handles both directions correctly, including going below zero.
---
Don't reset `activeIndex` anywhere on blur or on click — leaving it as whatever it last was is exactly what "remembered when tabbing away and back" requires. `aria-pressed` should toggle from a *separate* piece of state per button, updated only by `onClick`, so pressing a button never touches `activeIndex`.
