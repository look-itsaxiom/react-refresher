# `mergeProps`, `Disclosure`, and `Portal`

Build the generic prop-merging utility every primitive uses internally, a `Disclosure`
compound component that uses it, and a `Portal` wrapper.

## `mergeProps`

```tsx
function mergeProps(...propsList: Array<Record<string, unknown> | undefined>): Record<string, unknown>
```

Fold any number of prop objects into one, applying these rules **in argument order**
(earlier objects are considered first):

- `undefined` values are skipped — they must never erase an earlier object's defined
  value for the same key.
- `className`: concatenate every defined value across all objects, space-separated.
- `style`: shallow-merge every defined value across all objects (later values win per
  CSS property).
- Event handler props (keys matching `/^on[A-Z]/` whose value is a function): compose —
  call every object's handler for that key, in argument order (the earliest object's
  handler runs first).
- Anything else: the last object that defined it (non-`undefined`) wins.

## `Disclosure`

A compound component: `Disclosure.Root`, `Disclosure.Trigger`, `Disclosure.Content`.

- `Disclosure.Root({ open, defaultOpen = false, onOpenChange, children })` — owns open
  state (controlled/uncontrolled, same contract as `useControllableState` from the
  previous exercise — reimplement it here too) and provides it through context, along
  with a `useId()`-derived trigger id and content id.
- `Disclosure.Trigger({ className, children, ...rest })` — a `<button>` with
  `aria-expanded`, `aria-controls` pointing at the content's id, `data-state="open"` or
  `"closed"`, and an `onClick` that toggles. Combine its own props with `rest` (anything
  the caller passed through) using `mergeProps`. `className` may be a plain string **or**
  a function `(state: { open: boolean }) => string` — resolve it before merging.
- `Disclosure.Content({ className, forceMount, children, ...rest })` — a `<div
  role="region">` with `aria-labelledby` pointing at the trigger's id and
  `data-state="open"`/`"closed"`. While closed, render nothing **unless** `forceMount` is
  set, in which case keep it mounted with the native `hidden` attribute set instead.
  `className` supports the same function form as `Trigger`.

## `Portal`

```tsx
function Portal({ children, container }: { children: React.ReactNode; container?: Element | DocumentFragment | null })
```

Renders `children` into `container` via `createPortal`, falling back to `document.body`
when `container` is omitted (or `null`).

The starter includes a small demo in the default export; the checks exercise
`mergeProps`, `Disclosure`, and `Portal` directly.
