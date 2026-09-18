# Slot and Tabs

Build the two pieces underneath almost every compound component: a `Slot` that merges
props onto a single child (the mechanism behind `asChild`/`render`), and a `Tabs` compound
component built on top of it.

## `useControllableState`

```tsx
function useControllableState<T>(config: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (value: T) => void]
```

When `value` is `undefined`, the hook owns its own state (starting at `defaultValue`) and
`onChange` fires as a notification. When `value` is defined, the hook is controlled: the
returned value always equals the `value` prop, and calling the setter never changes it —
only `onChange` fires, and it's up to the caller to feed a new `value` back in.

## `Slot`

```tsx
function Slot({ children, ref, ...slotProps }: { children: React.ReactNode; ref?: React.Ref<unknown> } & Record<string, unknown>)
```

`Slot` expects exactly one child element (`React.isValidElement`) and clones it, merging
`slotProps` onto the child's own props:

- Plain props (anything not covered below): the **child's** value wins if it set one.
- `className`: concatenated as `` `${slotClassName} ${childClassName}` `` (skip either
  side if it's missing).
- `style`: merged as an object, child's keys win on conflict.
- Event handlers (`onClick`, `onKeyDown`, ...): both fire if both are functions — call the
  **child's** handler first, then the slot's.
- Refs: the slot's own `ref` prop and the child element's own `ref` must both end up
  pointing at the same DOM node. Support callback refs that return a React 19 cleanup
  function (a function returned from the callback, called on unmount/re-ref instead of
  calling the ref with `null`).

If `children` isn't a valid single element, `Slot` should render nothing.

## `Tabs`

A compound component: `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Content`.

- `Tabs.Root({ value, defaultValue, onValueChange, orientation = 'horizontal', children })`
  — owns the active value via `useControllableState` and provides it through context.
- `Tabs.List({ children, 'aria-label': ... })` — renders `role="tablist"`, sets
  `aria-orientation`, and owns the arrow-key navigation: `ArrowRight`/`ArrowLeft` in
  horizontal orientation (`ArrowDown`/`ArrowUp` in vertical) move focus to the next/previous
  tab **and activate it** (this is "automatic activation" — the active tab always matches
  the focused tab), wrapping from the last tab back to the first and vice versa. `Home`/
  `End` jump to the first/last tab.
- `Tabs.Trigger({ value, asChild, children })` — renders `role="tab"`,
  `aria-selected`, `aria-controls` pointing at its panel's id, `data-state="active"` or
  `"inactive"`, and roving `tabIndex` (`0` for the active tab, `-1` for every other tab).
  Clicking it activates that tab. Supports `asChild` via `Slot`.
- `Tabs.Content({ value, children })` — renders `role="tabpanel"` with
  `aria-labelledby` pointing at its trigger's id, only while its `value` is the active one
  (render nothing otherwise).

The starter includes a small demo in the default export so you can see it render; the
checks exercise `Slot`, `useControllableState`, and `Tabs` directly.
