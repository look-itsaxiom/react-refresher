# Typing components in 2026

If you learned React with TypeScript a few years ago, you probably reached for
`React.FC<Props>` on every component, argued with a coworker about whether that was a
good idea, and moved on. That debate is mostly over now, and it's worth knowing why —
not because the syntax matters much, but because the reasons behind it tell you
something about how component typing actually works.

## Why `React.FC` fell out of favor, and why it's fine again

The original complaint about `React.FC<Props>` was that it silently added a `children?:
ReactNode` prop to every component, whether or not the component used it. A `Tooltip`
that never rendered its children would still type-check if you passed some — the type
just lied to you. `@types/react` removed that implicit `children` years ago, so `FC` no
longer does this. The other complaints (awkward generics, forced `React.FC` when you
wanted named function declarations, incompatibility with `defaultProps` on function
components after React 19 dropped support for it) mean `FC` isn't the trap it once was —
but it also isn't buying you anything a plain typed function doesn't:

```tsx
// Equivalent today. Neither implies children.
const Card: React.FC<CardProps> = ({ title, children }) => { /* ... */ };
function Card({ title, children }: CardProps) { /* ... */ }
```

The plain function form is more common now because it supports generics directly
(`function Select<T>(props: SelectProps<T>) { ... }`) without the contortions `FC`
requires, and because named function declarations show up better in stack traces and
React DevTools than an anonymous arrow assigned to a `const`. Use whichever your team
prefers; the "implicit children" bug is what mattered, and it's gone.

## Extending native element props

Most components wrap a native element and want to accept everything that element
accepts — `className`, `onClick`, `aria-*`, `data-*`, all of it — without retyping each
one. `ComponentProps` and its variants pull those types straight from React's own JSX
definitions:

```tsx
import type { ComponentProps, ComponentPropsWithoutRef } from 'react';

type IconButtonProps = ComponentProps<'button'> & {
  icon: ReactNode;
};

function IconButton({ icon, children, ...rest }: IconButtonProps) {
  return <button {...rest}>{icon}{children}</button>;
}
```

`ComponentProps<'button'>` is the full prop type React assigns a `<button>`, including
`ref`. `ComponentPropsWithoutRef<'button'>` is the same type minus `ref` — reach for it
when your wrapper needs to manage the ref itself (forwarding it under a different name,
merging it with an internal ref, or exposing an imperative handle) rather than passing
it straight through. `ComponentProps` also works on your own components:
`ComponentProps<typeof DatePicker>` gets you `DatePicker`'s props without importing or
duplicating the type that defines them — useful when a sibling component needs to accept
"the same props as `DatePicker`, plus one more."

`PropsWithChildren<Props>` still exists for the case where a type alias, not a
component, needs `children` added: `type CardProps = PropsWithChildren<{ title: string
}>`. It's a one-line intersection, not a special mechanism — you could write `Props &
{ children?: ReactNode }` yourself.

## Discriminated unions for mutually exclusive props

A prop bag with a pile of optional fields lets callers pass nonsensical combinations —
`href` and `onClick` both set on something that's supposed to be either a link or a
button. A discriminated union fixes this at the type level: two shapes, one required
field that tells them apart.

```tsx
type LinkButtonProps = ComponentPropsWithoutRef<'a'> & { variant?: Variant; href: string };
type PlainButtonProps = ComponentPropsWithoutRef<'button'> & { variant?: Variant };
type ButtonProps = LinkButtonProps | PlainButtonProps;

function Button({ variant = 'primary', ...props }: ButtonProps) {
  if ('href' in props) return <a href={props.href} {...props} />;
  return <button type="button" {...props} />;
}
```

Because `href` is required in one branch and absent in the other, `'href' in props`
narrows `props` to the right branch — TypeScript follows the `in` check the same way it
follows a `typeof` or discriminant-field check on a tagged union. Callers who supply
`href` get anchor props and behavior; callers who don't get button props and behavior;
there's no third, ambiguous state to handle at runtime.

## `ReactNode` vs `ReactElement`, and event handler types

`ReactNode` is "anything React can render": elements, strings, numbers, arrays,
fragments, `null`, `undefined`, booleans (which render as nothing). It's the right type
for `children` and for anything you're about to drop into JSX as-is. `ReactElement` is
narrower — one specific JSX element, the return type of `createElement` and of a
component call — and you need it when you're going to inspect or clone the value
(`cloneElement`, checking `.type`, a component that only accepts a single specific child
element rather than arbitrary content).

Event handlers come from the same DOM typings `ComponentProps` uses:
`ChangeEventHandler<HTMLInputElement>`, or spelled out,
`(event: React.ChangeEvent<HTMLInputElement>) => void`. Type the parameter, not just the
function — `onChange={(e) => ...}` with an untyped `e` falls back to `any` the moment you
extract it to a named function, and you lose autocomplete on `e.target.value`.

## Refs and `use` in React 19

Since React 19, `ref` is an ordinary prop on function components — no `forwardRef`
needed for the common case:

```tsx
function TextField({ label, ref }: { label: string; ref?: Ref<HTMLInputElement> }) {
  return <label>{label}<input ref={ref} /></label>;
}
```

`useRef<HTMLInputElement>(null)` still gives you the local ref for DOM access;
`Ref<T>` is what you type a ref *prop* as, since it covers both the plain callback-ref
form and the object form `useRef` returns. Typing `use(promise)` for data and
`useActionState<State, Payload>` for form actions works the same way as typing any other
generic hook: supply the state type as the first parameter and let the return tuple's
types follow from it.

## Further reading (optional)

- [React TypeScript cheatsheet — Basic prop types](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example)
- [react.dev — TypeScript with React](https://react.dev/learn/typescript)
- [react.dev — Passing refs to components](https://react.dev/reference/react/forwardRef)
- [MDN — GlobalEventHandlers](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers)
