`useState()` with no argument initializes to `undefined`. A `value` prop that starts as
`undefined` is what triggers React's "uncontrolled to controlled" warning — give it a real
starting value instead.
---
Formatting-as-you-type means transforming the value in the `onChange` handler before it goes
into state, not after: `setCode(e.target.value.toUpperCase())`. The `<input>`'s `value` prop
already reflects state, so once state holds the uppercased string, the field shows it.
---
Validity is a derived value, not state you set yourself — compute it on every render from
`email`, the same way you'd compute a filtered list from an array:
`const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)`. Only show the error once the
field is non-empty, so an untouched form doesn't open with an error already showing. The
submit button's `disabled` prop is another derived value: `!(code.length > 0 && emailIsValid)`.
