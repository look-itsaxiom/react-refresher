`validate` needs two loops: one over the fields in `rules` (`Object.keys(rules)`), one over that
field's validator array. Run each validator against `values[field]`, and `break` out of the inner
loop the moment one returns a non-`null` string — later validators for that field shouldn't run.
---
Track which fields have been interacted with in their own piece of state, e.g. `useState<Record<string, boolean>>({})`, set to `true` in each input's `onBlur`. A field's error should only render when `touched[field]` is true, or the form has been submitted.
---
Call `validate(values, rules)` directly in the component body (not inside an effect) so `ok` and
`errors` are always derived from the latest `values` — no extra state to keep in sync.
---
`aria-disabled={!ok}` on the `<button type="submit">`, not `disabled={!ok}`. On submit, call
`setSubmitted(true)` unconditionally before checking `ok` — that's what makes every field's error
show up even if the user never blurred it, when they try to submit an incomplete form.
