`FilterBar` works. Type in the search box, click a filter, and the visible task list updates
correctly. But every interactive piece of it is a `<div>` with an `onClick`, so there's no way to
drive it the way a real user (or a real query) would — there's no accessible name anywhere, no
button, no label, and nothing announces when the result count changes.

Make it queryable, without changing what it does:

1. **The search field.** Wrap it in a landmark with `role="search"`, and give the `<input>` a
   real accessible name — a `<label>` (visually hidden if you don't want it to show) or an
   `aria-label` both work. It should be findable with `screen.getByRole('search')` for the
   landmark and `screen.getByLabelText(/search/i)` for the field itself.
2. **The filter chips.** Turn the "Active" and "Done" chips into real `<button>` elements with
   visible text as their name, and reflect which one is selected with `aria-pressed` — `true` for
   the currently active filter, `false` otherwise. Exactly one of "All", "Active", "Done" should
   read as `pressed: true` at a time (start with "All").
3. **The result count.** Give the element that shows "N results" `aria-live="polite"` (or wrap it
   in a `role="status"` region) so a screen reader announces the count when it changes, without
   moving focus.

Don't change the filtering logic, the item data, or what's rendered in the list — only the markup
and attributes needed to make each piece perceivable and queryable.
