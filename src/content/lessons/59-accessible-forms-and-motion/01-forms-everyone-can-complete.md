# Forms that everyone can complete

Lesson 17 wired a single field's error to its input with `aria-describedby`. That's necessary
but not sufficient. A real signup or checkout form has to survive a screen reader user tabbing
through it linearly, a screen magnifier user who can only see one field at a time, someone using
voice control who navigates by label text, and someone with a motor disability who cannot
usefully target a 10px checkbox. None of that is exotic — it's WCAG 2.2, and most of it is a
handful of attributes you're one edit away from already using correctly.

## Labels are not placeholders

A `placeholder` is not a label. It disappears the moment the user types, so anyone who looks away
and back — which includes everyone, not just people with cognitive disabilities — loses the
field's identity. Screen readers *sometimes* fall back to reading a placeholder as an accessible
name when there's no `<label>`, but support is inconsistent, and browsers render placeholder text
at reduced contrast by default, which fails 1.4.3 on its own. Use a real, always-visible
`<label for>` (or wrapping `<label>`), and put hint text — format examples, character limits — in
a separate element *before* the input, referenced by `aria-describedby`. That's WCAG 3.3.2, Labels
or Instructions: every input needs a label, and the format is stated in advance, not discovered
by trial and error after a rejection.

## `autocomplete` isn't just autofill convenience

WCAG 1.3.5, Identify Input Purpose, requires that inputs collecting common personal data expose
their *purpose* in a machine-readable way, via the HTML `autocomplete` attribute's standard token
vocabulary: `name`, `email`, `tel`, `street-address`, `cc-number`, `new-password`,
`one-time-code`, and dozens more (the full list is in the HTML spec, not something to guess at).
This isn't only about the browser filling in a saved address. Assistive technology and browser
extensions can use the token to relabel, resize, or re-render a field for a user with a cognitive
or motor disability — someone who benefits far more from autofill than the average user does,
because typing is exactly what's hard for them. Skipping `autocomplete` on a `name` or `email`
field is a real 1.3.5 failure, not a nice-to-have.

## Group things that are actually a group

A set of radio buttons for "shipping speed" is one question with several answers, not four
unrelated inputs. Wrap it in `<fieldset><legend>Shipping speed</legend>...</fieldset>` so a screen
reader announces the group's question once, and each radio's accessible name is `legend + label`,
not the label alone. If you're building a custom (non-native) set of options — a row of styled
buttons acting like radios — give the container `role="radiogroup"` with an
`aria-label`/`aria-labelledby`, and each option `role="radio"` with `aria-checked`. This is 1.3.1,
Info and Relationships: the grouping has to exist in the accessibility tree, not just visually.

## Required, without relying on color

Marking a required field with only a red asterisk or red border fails 1.4.1, Use of Color — color
alone can't be the only way to identify state, because it's invisible to people with certain color
vision deficiencies and to anyone using a monochrome or high-contrast display mode. Pair the
asterisk with visible text ("Email (required)" or a legend stating "All fields marked * are
required") and, on the input itself, `aria-required="true"`.

`aria-required` and the native `required` attribute aren't the same tool. `required` triggers the
browser's built-in validation: it blocks form submission and shows a native, unstyleable bubble
(and matches the `:invalid` CSS pseudo-class immediately, even before the user has touched the
field — which is its own usability problem, covered below). `aria-required` only adds the
semantic to the accessibility tree; it does nothing to submission or styling. Most production
forms that roll their own validation UI (as this lesson's exercise does) use `aria-required` for
the semantics and skip native `required` entirely, handling the actual blocking themselves so the
error message they show matches the one a screen reader announces.

## Identifying an error, precisely

WCAG 3.3.1, Error Identification, has three concrete parts, and it's easy to satisfy one and miss
the others:

1. **The error is described in text.** "Invalid" is not a description; "Enter your email in the
   format name@example.com" is.
2. **The erroring field is marked up as invalid.** `aria-invalid="true"` on the input while the
   error is showing (and removed, not just left `false`, once it's fixed).
3. **The field and its message are programmatically linked**, so a screen reader user tabbing to
   the field hears the error, not just sighted users seeing red text next to it. `aria-describedby`
   pointing at the message's `id` is the reliable way to do this today.

There's a fourth attribute built for exactly this — `aria-errormessage`, which is meant to convey
"this element is *the* error message" more precisely than `aria-describedby` (which is a generic
"more description" relationship, correct for hints and errors alike but not error-specific).
`aria-errormessage` sees inconsistent screen reader support even now, so treat `aria-describedby`
as the mechanism you actually ship, and think of `aria-errormessage` as something to revisit as
support improves — check current data before relying on it in production.

**Timing matters as much as markup.** `:invalid` in CSS matches an unfilled required field from
the instant the page loads — style off that and every empty form looks broken before the user has
typed anything. `:user-invalid` (a newer, more useful selector) only matches after the user has
interacted with the field and *then* left it invalid — after a blur, or after a submit attempt.
Prefer `:user-invalid` for validation styling, or replicate its timing yourself with a "touched"
flag, which is what this lesson's exercise does in plain React state so the behavior doesn't
depend on browser support.

## The error summary pattern

For a form with several invalid fields, jumping a screen reader user field-by-field to discover
each error is slow and easy to lose track of. The pattern used by GOV.UK and adopted widely since:
on a failed submit, render a summary block at the top of the form — a heading ("There is a
problem") followed by a list of every error, each one a link to its field (`href="#field-id"`).
Move keyboard focus to that summary's heading immediately after the failed submit, using a
heading with `tabIndex={-1}` (focusable programmatically, not part of tab order) and an imperative
`.focus()` call. A screen reader user then hears the full list of what's wrong without moving,
and can activate any link to jump straight to that field, focusing it in the process.

Whether focus goes to the summary or to the first invalid field on submit is a judgment call —
both are documented, defensible patterns. The summary wins when there are multiple errors because
it gives an overview before commitment to fix one thing; jumping straight to the first field wins
for short forms. Either way, focus must move *somewhere* meaningful — leaving it on the submit
button after a failed submit, with no indication anything happened beyond a color change, is the
actual failure mode this rule exists to prevent.

## Don't ask for what you already have, or what excludes people

Two 2.2-era criteria worth knowing by number because they're easy to violate without noticing:

- **3.3.7, Redundant Entry** — don't make a user re-type information they already gave you in the
  same process (their address for both shipping and billing, a "confirm email" field that can't
  be pasted into). Either populate it for them, or let them select "same as above." If a
  confirm-password field is unavoidable, don't block pasting into it.
- **3.3.8, Accessible Authentication (Minimum)** — a login or signup flow can't *require* a
  cognitive function test (solving a puzzle, transcribing a code, remembering a password from
  scratch) as the *only* way to authenticate, unless it's genuinely essential (e.g., recognizing a
  photo you set is fine; a CAPTCHA with no alternate modality is not). In practice: support pasting
  into password fields, support password managers, offer email-link or one-time-code login as an
  alternative if you use a CAPTCHA.

And 2.5.8, Target Size (Minimum), sets a floor of 24×24 CSS pixels for interactive targets
(checkboxes, small icon buttons) unless there's enough spacing around a smaller target or an
equivalent larger target is available elsewhere. Small checkboxes with generous label padding
that's also clickable satisfy this without changing the checkbox's visual size.

## React 19 form actions and error state

`useActionState` (covered in lesson 17) is a natural fit for all of this: the action returns
`{ errors, values }`, so a failed submission never clears what the user typed — the single biggest
usability win in this entire list, accessible or not. The pattern from lesson 17 — action returns
per-field errors and the last-submitted values, inputs are `defaultValue`d from that returned
state — combines directly with everything above: add the error summary and focus management as a
layer on top of the returned `errors` object, keyed by the same field names.

### Further reading

- [WCAG 2.2 quick reference, filtered to level A/AA](https://www.w3.org/WAI/WCAG22/quickref/)
- [WHATWG HTML: autofill field name list](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens)
- [GOV.UK Design System: error summary pattern](https://design-system.service.gov.uk/components/error-summary/)
- [MDN: `:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid)
