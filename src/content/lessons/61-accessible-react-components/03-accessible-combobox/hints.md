Add `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-autocomplete="list"` directly on the `<input>`. `aria-controls` should hold the same `id` you put on the `<ul>` (make it `role="listbox"`).
---
Track which option is "active" with a single index, e.g. `useState(-1)` meaning "none active." Compute the active option's `id` from that index and put it on the input's `aria-activedescendant` — but never call `.focus()` on the option itself; the input keeps real focus the whole time.
---
Put the arrow-key handling in `onKeyDown` on the input. `ArrowDown`/`ArrowUp` adjust the active index with `Math.min`/`Math.max` so it clamps at the edges instead of going out of range; `Home`/`End` jump straight to `0` and `filtered.length - 1`.
---
`Enter` should call the same "commit" function a click on an option calls — fill the input with `filtered[activeIndex]` and close the popup. `Escape` just closes the popup (`setOpen(false)`) without touching the input's value.
---
Use `useId()` three times — once for the input, once for the listbox, and once as a prefix for the per-option ids (`` `${optionIdPrefix}-${index}` ``) — so every id is unique per instance and doesn't get regenerated on each render.
