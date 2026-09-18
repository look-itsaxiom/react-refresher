# Controlled and uncontrolled inputs

React gives you two ways to let the DOM hold an `<input>`'s value: let React own it
(**controlled**) or let the browser own it (**uncontrolled**). React 19's Actions did not
remove this choice — they made the uncontrolled path good enough that you no longer reach for
"controlled" by default the way you did in the class-component era.

## Controlled: React is the single source of truth

```tsx
function EmailField() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

Every keystroke fires `onChange`, you update state, React re-renders, and the `<input>`'s
`value` prop is set back to what you just stored. The DOM value only ever changes because React
told it to. That round-trip is what makes controlled inputs powerful:

- **Live validation** — reject or flag characters as they're typed.
- **Formatting as you type** — uppercase a code, insert dashes into a phone number, mask a
  credit card.
- **Cross-field reactivity** — disable a submit button, sync a "confirm password" field, derive
  one field from another.
- **Programmatic control** — reset, prefill, or overwrite a field from outside the input itself.

The cost: a render on every keystroke, and a footgun if you get the wiring wrong.

### The footgun: sliding into uncontrolled by accident

An input is controlled the instant you pass it a `value` prop, and it **must stay controlled**
for its whole life. If `value` is ever `undefined` — because state started as `undefined`, or a
conditional expression fell through — React hands control back to the browser mid-flight and
logs:

```
Warning: A component is changing an uncontrolled input to be controlled.
```

or the reverse warning if it starts controlled and drops to `undefined` later. Either way,
your `onChange` handler is now fighting the browser instead of driving it. The fix is always
the same: give the state a real initial value (`useState('')`, not `useState()`), and never let
a derived `value` expression evaluate to `undefined` — fall back to `''` explicitly.

## Uncontrolled: the browser is the source of truth

```tsx
function EmailField() {
  return <input name="email" defaultValue="" ref={inputRef} />;
}
```

The DOM owns the value. React never sees a keystroke unless you ask for it (via a `ref`, or by
reading `FormData` on submit). `defaultValue` sets the *initial* value only — React will not
fight the user's typing to keep it in sync, which is exactly the point.

### Reading an uncontrolled form: `FormData`

The idiomatic React 19 way to read a whole uncontrolled form is `FormData`, driven by the
native `<form>` element and a **form action**:

```tsx
function ContactForm() {
  function createContact(formData: FormData) {
    const email = formData.get('email');
    // ...
  }
  return (
    <form action={createContact}>
      <input name="email" defaultValue="" />
      <button>Save</button>
    </form>
  );
}
```

Passing a function to a `<form>`'s `action` prop is a React 19 addition: React calls it with
the form's `FormData` on submit, and — this is the part that used to take a `useEffect` and a
ref — **automatically resets the uncontrolled fields once the action completes successfully**.
No `formRef.current.reset()`, no controlled state you had to clear by hand. Lesson 03, Actions
and optimistic UI, covers `useActionState` and `useFormStatus`, which build pending/error state
on top of this same mechanism. If all a form needs is "collect values, submit, clear on
success," an uncontrolled form with an action is now less code than the controlled version, not
more.

## So which one, in September 2026?

Default to **uncontrolled + actions** for plain "fill in fields, submit" forms — signups,
settings pages, anything where you don't need to react to a value until submit. Reach for
**controlled** when you need to *do something with a value before submit*: live validation
messages, input formatting, one field's UI depending on another's current value, or a
multi-step wizard that must persist partial state as state. The two are not mutually exclusive
within one form — you can mix a controlled "confirm password" field (needs to compare live)
with uncontrolled text inputs (just along for the ride) in the same `<form>`.

For anything beyond a handful of fields — cross-field validation rules, array fields, schema
validation — reach for a form library rather than hand-rolling either approach at scale; lesson
17 (Forms and validation) compares `react-hook-form`, TanStack Form, and Standard Schema
adapters like Zod.

## Updating list state immutably

Whichever input strategy you use, once values land in state that backs a list, update it
without mutating the array or its items — mutation defeats the `key`-based identity you just
learned about, since React and the Compiler both assume state you didn't reassign hasn't
changed.

```tsx
setItems((items) => [...items, newItem]);          // add
setItems((items) => items.filter((i) => i.id !== id)); // remove
setItems((items) => items.map((i) => (i.id === id ? { ...i, done: true } : i))); // update one
setItems((items) => items.toSorted((a, b) => a.order - b.order)); // sort, ES2023
setItems((items) => items.with(index, updated)); // replace by index, ES2023
```

`toSorted`, `toReversed`, `with`, and `toSpliced` are the array methods added specifically to
stop people reaching for `.sort()`/`.reverse()`/index assignment — all of which mutate in
place and silently break memoization and keys. They've shipped in every browser React 19
targets since 2023; there's no polyfill tax to reach for them by default now.

## Further reading

- [react.dev — Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [react.dev — `<input>` reference, controlled vs. uncontrolled](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable)
- [react.dev — `<form>` `action` prop](https://react.dev/reference/react-dom/components/form)
- [MDN — Array.prototype.toSorted / .with](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)
