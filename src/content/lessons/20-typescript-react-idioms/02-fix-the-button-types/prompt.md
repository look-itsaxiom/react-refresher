`Button` currently takes a bag of optional props: `variant`, `href`, `onClick`,
`aria-label`, `children`. That shape lets a caller pass `href` and `onClick` together
even though only one makes sense, it drops `aria-label` (and everything else that isn't
explicitly named) instead of forwarding it, and it always renders a `<button>` even when
`href` is set.

Replace `ButtonProps` with a discriminated union of two branches:

```ts
type LinkButtonProps = ComponentPropsWithoutRef<'a'> & { variant?: ButtonVariant; href: string };
type PlainButtonProps = ComponentPropsWithoutRef<'button'> & { variant?: ButtonVariant };
type ButtonProps = LinkButtonProps | PlainButtonProps;
```

Then update `Button` so that:

- A `Button` with `href` renders an `<a>` with that `href`.
- A `Button` without `href` renders a `<button>`.
- Every other prop you didn't destructure (`aria-label`, `onClick`, `onFocus`,
  `disabled`, anything from the matching native element) is spread onto whichever
  element you render, so it actually reaches the DOM.

`'href' in props` is enough for TypeScript to narrow `props` to the right branch of the
union inside each `if` — you don't need a type assertion.
