Do the focus-management work in a `useEffect` inside `Drawer` that depends on `open`, guarded with `if (!open) return;` at the top — that way the effect (and its cleanup) only runs for the open-to-closed and closed-to-open transitions, not on every unrelated render.
---
Query the drawer's focusable elements with `container.querySelectorAll('button, input, [href], select, textarea, [tabindex]')` instead of hardcoding which button is "first" — call it once to focus the first item on open, and again inside the keydown handler so it stays correct if the drawer's contents ever change.
---
Attach a single `keydown` listener to the drawer's container element (not `document`) for both `Escape` and `Tab`. For `Escape`, just call `onClose()`. For `Tab`, get the current first and last focusable elements: if `event.shiftKey` and `document.activeElement` is the first one, `event.preventDefault()` and focus the last; if not `event.shiftKey` and `document.activeElement` is the last one, `event.preventDefault()` and focus the first.
---
To return focus to the opener, pass a `ref` to the "Open settings" button down into `Drawer` (as a prop, e.g. `openerRef`), and call `openerRef.current?.focus()` from the effect's **cleanup function** — the cleanup runs exactly when `open` flips back to `false` (or the drawer unmounts), which is exactly "the drawer just closed."
---
For the background, React 19 accepts `inert` as a plain boolean prop: `<div inert={open} aria-hidden={open || undefined}>`. You don't need `useEffect` for this part — it's just conditional attributes tied to `open`.
