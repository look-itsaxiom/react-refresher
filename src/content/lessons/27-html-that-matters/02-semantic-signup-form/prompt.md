This signup form works, but it's div-soup: no `<form>`, no labels, no native validation, and a
click handler standing in for a submit button. Rebuild it with semantic HTML and let the
constraint validation API do the validating.

Requirements:

1. Wrap everything in a real `<form>` element with `aria-label="Sign up"` (so it's reachable via
   `getByRole('form', { name: 'Sign up' })` — a `<form>` only gets the `form` landmark role when
   it has an accessible name).
2. Group the two fields in a `<fieldset>` with a `<legend>` of `Your details`.
3. Replace the two `<div>` "fields" with real `<label>`-wrapped `<input>`s:
   - **Name** — `required`.
   - **Email** — `type="email"` and `required`.
4. Replace the `<div onClick>` "button" with a real `<button type="submit">Create account</button>`.
5. On submit, prevent the default page navigation, then check
   `event.currentTarget.checkValidity()`. If it's valid, show the text `Account created` inside an
   `<output>` element; if it's not valid, don't show that text (the browser's own native
   validation UI handles telling the user what's wrong — you don't need to build your own error
   display for this exercise).

You do not need any `useState`. The browser is doing the validating; your job is to ask it via
`checkValidity()` and reflect the yes/no answer in the `<output>`.
