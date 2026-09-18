# Anatomy of a compliant combobox

The exercise that follows has you hand-build the APG "editable combobox with list
autocomplete" pattern — the one behind a filterable dropdown like a country picker or a
tag search. Understanding every attribute here is what makes evaluating a headless
library's output possible; without it, you can't tell whether the library got it right.

## Roles and attributes

| Element | Attribute | Value |
|---|---|---|
| the text input | `role` | `combobox` (a plain `<input type="text">` has no implicit combobox role — you add it) |
| the input | `aria-expanded` | `true` while the popup is open, `false` otherwise |
| the input | `aria-controls` | the `id` of the listbox popup |
| the input | `aria-autocomplete` | `list` (typing filters a list you display; use `none` if there's no popup, `both` if you also inline-complete the input's own text) |
| the input | `aria-activedescendant` | the `id` of the currently-active `option`, or omitted when nothing is active |
| the popup | `role` | `listbox` |
| each item | `role` | `option` |
| each item | `aria-selected` | `true` on the one active option, `false` (or absent) on the rest |

## `aria-activedescendant`, not moved focus

This is the detail every hand-rolled combobox gets wrong at least once: **real DOM focus
never leaves the input.** `document.activeElement` stays on the `<input>` for the entire
interaction — opening the popup, arrowing through options, even after selecting one.
"Moving" to an option means updating `aria-activedescendant` on the input to that option's
`id` and toggling its `aria-selected`; it does not mean calling `.focus()` on the option.

This is the same trade-off lesson 58 introduced for the toolbar, but the answer is
flipped: the toolbar's five buttons are static and always mounted, so roving `tabindex`
(moving real focus between them) was the better fit. A combobox's options are transient —
they don't exist until you type, and the whole point is that you keep typing while a
screen reader announces which option is "active" without ever losing your place in the
text field. `aria-activedescendant` is the pattern built for exactly that: a container
(the input, here) keeps real focus while a descendant reference tracks the logical
selection.

## The keyboard map

- **Typing** filters the list — this is free, it's just the input's own `onChange`.
- **`ArrowDown`** moves the active option forward (or opens the popup and activates the
  first option, if the popup was closed).
- **`ArrowUp`** moves it backward.
- **`Home`** / **`End`** jump straight to the first / last option.
- **`Enter`** commits the active option: fill the input with its text and close the popup.
- **`Escape`** closes the popup (some implementations also clear the input on a second
  `Escape`; closing is the part every implementation must do).
- **Printable characters** just keep typing into the input — no special handling needed
  beyond what `onChange` already does.

Pointer interaction has to reach the same end state as the keyboard: clicking an option
should commit it exactly like pressing `Enter` on it would.

## Announcing the result count

Sighted users see the filtered list shrink as they type. Screen reader users need that
same signal spoken, which is what a `role="status"` region is for — its implicit
`aria-live="polite"` means updates get queued and announced without interrupting whatever
the user is doing. Update its text to something like `"4 results"` whenever the filtered
count changes. In production, debounce this update (a short `setTimeout`, or React's
`useDeferredValue` around the filtered list) so a fast typist doesn't trigger a new
announcement on every keystroke — a screen reader with a backlog of five queued
announcements is worse than no announcement.

## Managing ids with `useId`

Every id referenced by `aria-controls` or `aria-activedescendant` has to be unique per
component instance (two comboboxes on the same page can't share a listbox id) and stable
across re-renders (an id that changes on every keystroke breaks the very reference it's
supposed to hold). React's `useId` hook exists for exactly this: call it once per
component instance, and derive the input id, listbox id, and a per-option id prefix from
it, instead of hardcoding strings or generating ids in render.

## Pitfalls

- **Focus jumping into the list.** The moment any code calls `.focus()` on an option, the
  activedescendant model breaks — the screen reader now thinks focus moved to the popup,
  the input's `aria-activedescendant` becomes irrelevant, and typing to keep filtering
  stops working. If you ever reach for `.focus()` in a combobox handler, you've likely
  slipped into the roving-tabindex model by accident.
- **Filtering on every keystroke with no transition.** Fine for a few dozen options; on a
  list with thousands of rows, synchronous filtering on every keystroke can make typing
  feel laggy. `useDeferredValue` on the filter query (or `startTransition` around the
  state update) keeps the input responsive while the list catches up.
- **No empty state.** When the filter matches nothing, render something — even just "No
  matches" inside the status region — instead of silently rendering an empty popup. A
  screen reader user who hears nothing doesn't know whether the search is still running or
  simply found nothing.
- **Forgetting `aria-selected`.** A CSS highlight class on the "active" option is invisible
  to a screen reader without `aria-selected` on that same element — sighted and non-sighted
  users end up with different information about which option is active.

## Further reading

- [WAI-ARIA APG: Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [MDN: `aria-activedescendant`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-activedescendant)
- [React docs: `useId`](https://react.dev/reference/react/useId)
- [MDN: `aria-autocomplete`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-autocomplete)
