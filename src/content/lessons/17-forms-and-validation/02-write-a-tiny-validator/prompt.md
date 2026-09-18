Schema libraries like Zod boil down to the same shape you're about to build: a function that
runs a field's value through an ordered list of checks and returns the first failure. Real
libraries add types, composition, and async checks; the mechanics are this exercise.

Implement `validate`:

```ts
function validate(
  values: Record<string, string>,
  rules: Record<string, Array<(value: string) => string | null>>,
): { ok: boolean; errors: Record<string, string> };
```

For each field in `rules`, run its validators **in order** against `values[field]` and stop at
the first one that returns a non-`null` message — that's the field's error. A field with no
failing validator has no entry in `errors`. `ok` is `true` only when `errors` is empty.

Then wire it into the form already scaffolded in `App`:

- Call `validate(values, rules)` on every render so `errors` always reflects the current values.
- Show a field's error (in an element with `role="alert"`) once that field has been blurred, or
  once the form has been submitted — whichever happens first.
- Give the submit button `aria-disabled={!ok}` (not the native `disabled` attribute — a
  disabled button can't be clicked, and you need clicking it while invalid to still mark every
  field as submitted so its errors show).
- On submit, if the form is valid, show a success message and skip otherwise.

The two rule factories (`required`, `minLength`, `isEmail`) and the `rules` object are already
written — you're wiring `validate` and the touched/submitted display logic, not inventing new
validators.
