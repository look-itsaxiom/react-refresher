# Build an accessible combobox

`App` renders a fruit search: an `<input>` and, once you type, a plain `<ul>` of
matching fruits. It filters correctly and mouse clicks work, but it has none of the APG
combobox wiring — a screen reader user gets no indication a popup exists, which option
is active, or how many results there are.

Rebuild it into the APG "editable combobox with list autocomplete" pattern from the
previous concept.

1. **The input has `role="combobox"`**, with `aria-expanded` reflecting whether the
   popup is open, `aria-controls` pointing at the popup's `id`, and
   `aria-autocomplete="list"`.
2. **The popup is `role="listbox"`**, and each item is `role="option"`.
3. **Arrow keys move a virtual "active" option, not real focus.** `ArrowDown`/`ArrowUp`
   move the active option (opening the popup and activating the first option if it was
   closed); `Home`/`End` jump to the first/last option. The active option's `id` is
   reflected on the input's `aria-activedescendant`, and that option has
   `aria-selected="true"`. **`document.activeElement` stays on the input the entire
   time** — never call `.focus()` on an option.
4. **`Enter` commits the active option**: fill the input with its text and close the
   popup. **`Escape` closes the popup** without changing the input's text.
5. **Clicking an option** commits it the same way `Enter` would.
6. **A `role="status"` region reports the result count** (e.g. `"4 results"`) whenever
   the popup is open, and is empty when it's closed.

Use `useId` to generate the input, listbox, and option ids so they stay unique and
stable across re-renders.
