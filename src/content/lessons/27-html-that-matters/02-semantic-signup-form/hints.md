A styled `<div>` never gets the `form`, `button`, or landmark roles no matter how it's styled —
those come from the tag, not the CSS. Swap the outer `<div>` for `<form aria-label="Sign up">`,
the label text `<div>`s for `<label>` elements wrapping their `<input>`, and the click-handler
`<div>` for a real `<button type="submit">`.
---
Nesting an `<input>` inside a `<label>` associates them without needing `htmlFor`/`id` — clicking
the label text focuses the input, and `getByLabelText` finds it. `required` on the Name input and
`type="email" required` on the Email input are what do the actual validating; you don't need any
regex or `useState` for the validation itself.
---
Handle `onSubmit` on the `<form>` (not `onClick` on the button): call `event.preventDefault()`
first, then `event.currentTarget.checkValidity()`. Store the result text in a
`useState('')` and render it inside `<output>{result}</output>` — leave it empty until the form
passes. You'll notice the browser already blocks the submit event entirely while a required field
is empty or the email is malformed, so in practice `checkValidity()` reads `true` whenever your
handler actually runs; keep the check anyway, it's what makes the guarantee explicit.
