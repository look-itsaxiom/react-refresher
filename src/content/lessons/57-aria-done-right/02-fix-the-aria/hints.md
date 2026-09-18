Start with the toggle. A disclosure button needs two things: `aria-expanded` kept in sync with
your `open` state (a boolean, not a string you set once), and `aria-controls` pointing at the
`id` of the panel it reveals. Both belong on a real `<button>`, not a `<div>`.

---

For the panel, add an `id` that matches what you put in the toggle's `aria-controls`, plus
`role="region"` and `aria-label="Notifications"` so it's exposed as a named landmark rather than
an anonymous `<div>`.

---

The mute control has the right *state* attribute (`aria-checked`) on the wrong *role* and the
wrong *element*. Change `role="button"` to `role="switch"`, and change the `<div>` to a
`<button>` — that switch to a real button is what makes Space/Enter activate it, with no keydown
handler required.

---

`aria-label` on a plain `<div>` with no role is invisible to the accessibility tree — browsers
don't compute an accessible name from it. Instead, give the "Mute" text an `id`, and connect the
switch to it with `aria-labelledby="that-id"`.

---

Last one: the `Dismiss all` button already has native button semantics. `role="button"` on a
`<button>` is redundant — just delete it.

---

Full shape, if you're stuck:

```tsx
<button type="button" aria-expanded={open} aria-controls={panelId} onClick={...}>
  Notifications
</button>
{open && (
  <div id={panelId} role="region" aria-label="Notifications">
    <span id="mute-label">Mute</span>
    <button type="button" role="switch" aria-checked={muted} aria-labelledby="mute-label" onClick={...}>
      {muted ? 'On' : 'Off'}
    </button>
    <button type="button" onClick={...}>Dismiss all</button>
  </div>
)}
```
