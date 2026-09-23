# Forms the platform already handles

The controlled-input lesson (lesson 7) showed you how to validate a field with `useState` and a
regex on every keystroke, because you needed live feedback and full control over the value. Most
forms don't need that much machinery. Before you reach for a validation library, or even your own
`useState` + regex, know what the `<form>` element already does.

## The constraint validation API

Attributes you've probably typed without thinking about what backs them — `required`,
`type="email"`, `minlength`, `maxlength`, `min`, `max`, `pattern`, `step` — aren't just hints for
autofill. They feed a real state machine every form-associated element carries: `validity`, a
`ValidityState` object with boolean flags (`valueMissing`, `typeMismatch`, `tooShort`,
`patternMismatch`, `rangeUnderflow`, and more) plus one summary flag, `valid`. Two methods read
that state:

```tsx
const input = event.currentTarget; // an HTMLInputElement
input.checkValidity();   // true/false, fires an `invalid` event if false, no UI
input.reportValidity();  // same check, but also shows the browser's native validation bubble
```

Call `checkValidity()` (or `reportValidity()`) on the whole `<form>` and it checks every
form-associated control inside it, so a submit handler can gate on one call instead of walking
fields by hand:

```tsx
function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!event.currentTarget.checkValidity()) return; // native bubbles show automatically on submit
  // ...
}
```

You get this for free even without a submit handler: an uncontrolled `<form>` refuses to submit
at all while any required field is empty or any pattern fails, and the browser shows its own
inline message pointing at the offending field. That's the behavior you'd otherwise write by hand
with `useState` per field, an error-message component, and a `noValidate` form.

## Custom messages and `:user-invalid`

The default "Please fill out this field" bubble is serviceable, not good copy. Override it with
`setCustomValidity`:

```tsx
function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  input.setCustomValidity(input.validity.typeMismatch ? 'Use a real email address, like you@work.com' : '');
}
```

Passing any non-empty string marks the field invalid with that message until you clear it with an
empty string on a later event — forgetting the clear is the most common bug with this API: the
field stays permanently invalid because nothing ever resets the message.

For styling, `:invalid`/`:valid` apply from the first render, which is why a required empty field
looks red before the user has touched it. `:user-invalid` (Baseline 2024) only matches after the
user has interacted with the field, which is almost always the UX you actually want and the CSS
equivalent of the "don't show the email error until the field is non-empty" rule from lesson 7's
controlled-form exercise — except here the browser tracks "has the user interacted" for you.

## Attributes that remove entire categories of custom code

- **`<datalist>`** pairs with `<input list="...">` to offer autocomplete suggestions from a
  known set without forcing the value to be one of them — a hybrid between `<select>` and free
  text, useful for "pick a common answer, or type your own."
- **`inputmode`** (`"numeric"`, `"email"`, `"tel"`, `"decimal"`, `"search"`, `"url"`) changes the
  on-screen keyboard on mobile without changing what the value is validated or typed as — use it
  alongside `type`, not instead of it, when `type` alone doesn't pick the keyboard you want (a
  numeric-only PIN is still `type="text" inputmode="numeric" pattern="\d*"`, because
  `type="number"` adds spinner arrows and lets `-`/`e` through).
- **`autocomplete`** tokens (`"email"`, `"new-password"`, `"current-password"`,
  `"one-time-code"`, `"street-address"`, `"cc-number"`) are what let a password manager or the
  browser's own autofill fill a field correctly instead of guessing from your `name` attribute.
  `"one-time-code"` in particular lets a browser pull a code straight out of an SMS.
- **`enterkeyhint`** (`"go"`, `"search"`, `"send"`, `"done"`, `"next"`) relabels the mobile
  keyboard's enter key so it reads "Search" or "Send" instead of a generic checkmark.
- **`form`** lets a button (or any form-associated element) outside a `<form>`'s DOM subtree
  still submit it, by id — useful when a submit button lives in a modal footer rendered
  elsewhere in the tree, or a sticky action bar outside the form markup.
- **`formaction`/`formmethod`/`formnovalidate`** on a `<button type="submit">` override the
  parent form's `action`/`method`/validation for that one button — the classic use is a form with
  both a "Save" and a "Save as draft" button, where only "Save" needs full validation.

## Native `<form>` plus React 19 actions

React 19 actions (covered in the React 19 track) build on this rather than replacing it: passing
a function to a `<form>`'s `action` prop gets you the whole `FormData` payload on submit,
automatic pending state via `useFormStatus`, and — because it's still a real `<form>` — every
constraint-validation attribute above still runs first. A `required` field still blocks
submission, native validation bubbles still show, before your action function ever runs. You are
not choosing between "native form" and "React form"; React 19's form actions are a thin
progressive-enhancement layer on top of the native element, not a replacement for it.

## When to still reach for JS validation

Constraint validation is per-field and mostly synchronous. Reach for the `useState` + regex
approach from lesson 7 (or a library) when validation needs to:

- compare two fields against each other ("password" vs "confirm password"),
- hit the network (checking a username isn't taken),
- show a live formatted preview as the user types (this lesson's uppercasing referral code), or
- render error text with your own component and layout instead of the browser's native bubble.

The two approaches compose: use `required`/`type`/`pattern` for the baseline the platform checks
for free, and layer `useState`-driven UI on top for anything the constraint validation API can't
express.

## Further reading (optional)

- [MDN: Constraint validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation)
- [MDN: `ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState)
- [MDN: `:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid)
- [web.dev: Sign-in form best practices](https://web.dev/articles/sign-in-form-best-practices)
