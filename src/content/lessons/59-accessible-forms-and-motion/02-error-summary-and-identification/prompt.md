The signup form below already does what lesson 17's exercise did: each field's error is text,
`aria-invalid` is set while it's wrong, and `aria-describedby` points at the message. That's not
enough for a form with three fields that can all be wrong at once. Add the rest.

1. **Error summary.** After a failed submit, render a `<div role="alert">` containing a heading
   ("There is a problem") and an unordered list — one `<li>` per field with an error, each
   containing an `<a href="#<field-id>">` whose text is that field's error message.
2. **Focus the summary.** The heading must have `tabIndex={-1}` (focusable via script, not part of
   normal tab order) and, immediately after a failed submit, `document.activeElement` must be that
   heading. Nothing should be focused this way on a *successful* submit or before the first submit
   attempt.
3. **Links jump and focus.** Clicking one of the summary's links must move focus to the
   corresponding input (not just scroll to it — call `.focus()` yourself; don't rely on default
   hash-navigation focus behavior).
4. **Required, visibly.** All three fields are required. Add visible text near each label (e.g.
   "Required") in addition to `aria-required="true"` on the input — don't mark required with color
   alone.
5. **`autocomplete`.** Add the correct autofill token to the name and email inputs
   (`autocomplete="name"`, `autocomplete="email"`).

You're not changing the validation rules or the per-field error wiring — `validate`, the field
list, and the existing `aria-invalid`/`aria-describedby` pairing are done. You're adding the
summary, the focus management around it, and the two markup gaps (required text, autocomplete).
