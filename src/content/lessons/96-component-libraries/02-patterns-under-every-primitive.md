# The patterns under every primitive

Open the source of a Radix, Base UI, or React Aria Components primitive and you'll find
the same handful of patterns wearing different names. This is the lesson's real payload:
once you can build these by hand, reading (and debugging, and extending) any headless
library's internals stops being a black box.

## Compound components with context

`<Tabs.Root>`, `<Tabs.List>`, `<Tabs.Trigger>`, `<Tabs.Content>` isn't four unrelated
exports — it's one piece of state (which tab is active) shared through `createContext`,
with each sub-component reading or writing that context. `Root` owns the state and
provides it; every other piece is a consumer. This is standard React, not a library
trick — Radix, Base UI, and React Aria Components all do exactly this internally. The
win over prop-drilling `activeTab`/`onTabChange` through every layer is that consumers can
rearrange `List`, `Trigger`, and `Content` freely (wrap them, add siblings, put `List`
somewhere unexpected in the DOM) without the API needing to grow new props for each
arrangement.

## Controlled and uncontrolled, one hook

Every stateful primitive needs to work two ways: `<Tabs.Root defaultValue="a">` (the
component owns the state) and `<Tabs.Root value={tab} onValueChange={setTab}>` (the
parent owns it, e.g. to sync the active tab to a URL param). Handling both branches inline
in every component is repetitive and easy to get subtly wrong — so the pattern is a single
hook, often called `useControllableState`, that a `value` prop switches into controlled
mode:

```tsx
function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (value: T) => void] {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;

  function setValue(next: T) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  return [current, setValue];
}
```

The important detail: in controlled mode, `setValue` still calls `onChange` but never
touches internal state — the component doesn't move until the parent re-renders it with a
new `value`. Skip that and a "controlled" component silently goes uncontrolled the moment
someone forgets to update their state, which is one of the more common bug reports against
hand-rolled compound components.

## `asChild` / `render`: slot merging

A `<Tabs.Trigger>` renders a `<button>` by default. But sometimes you need it to *be* an
`<a>` (routing tabs), or a custom `<Button>` component with its own styling — without
losing the ARIA attributes and click handler `Trigger` was going to attach. Radix and
shadcn call this `asChild`; Base UI calls the equivalent prop `render`. Under `asChild`,
the primitive doesn't render its own DOM node — it clones the single child you pass and
merges its own props onto it via a `Slot` component.

Merging isn't a plain object spread, because plain props, `className`, `style`, event
handlers, and refs each need different treatment:

- **Plain props** (`id`, `aria-*`, `type`): the child's own value wins if it set one.
- **`className`**: concatenated — you want both the primitive's state classes and the
  child's own classes on the same element.
- **`style`**: merged as an object — same reasoning.
- **Event handlers**: composed, both fire. Order matters and libraries pick one
  convention deliberately; this lesson's `Slot` calls the *child's* handler first, then
  the primitive's — so a child's `preventDefault()` (if it calls one) still lets the
  primitive observe the event afterward, but the child's own logic always runs.
- **Refs**: merged with a callback ref that sets every ref it was given. React 19's ref
  callbacks can return a cleanup function (mirroring `useEffect`); a correct merge must
  call each ref's cleanup, not just null it out, when the node unmounts.

## Controlling props more generally: `mergeProps`

`Slot`'s merge logic generalizes into a `mergeProps(...propsList)` utility: fold N prop
objects into one, applying the same className/style/handler rules across all of them, in
argument order. Libraries use this constantly — not just for `asChild`, but anywhere a
primitive's own internal props (an `onClick` that manages state, a computed `aria-*`) need
to combine with whatever the consumer passed through.

## Data attributes, not classes, for state

A primitive doesn't know your styling system, so it can't decide `is-open` vs.
`open` vs. `Component--active` as a class name. Instead it exposes state as `data-*`
attributes — `data-state="open"`, `data-disabled`, `data-orientation="vertical"` — and you
style off them. With Tailwind 4's arbitrary-attribute variants this reads naturally:

```html
<button class="opacity-100 data-[state=open]:opacity-50 data-[disabled]:cursor-not-allowed">
```

React Aria Components takes this one step further for consumers who don't want to build
their own class-name logic: `className` (and `style`) can be a **function** that receives
the component's render state (`{ isOpen, isDisabled, isFocused, ... }`) and returns the
class string, so the state → style decision lives in one place instead of being derived
twice (once in the library's data attributes, once in your CSS).

## Roving tabindex, dismiss layers, and portals

Two keyboard patterns recur across every composite widget: **roving tabindex** (only the
active item in a group has `tabIndex={0}`; arrow keys move both DOM focus and that active
index, everything else is `-1` so Tab skips straight past the group) and **dismiss
layers** (a popover, menu, or dialog closes on outside click or Escape, and the outermost
open layer swallows the dismissal first). Anything that needs to visually escape a
clipped or `overflow: hidden` ancestor — menus, tooltips, dialogs — renders through
`createPortal` into `document.body` (or a purpose-built container), and libraries then
handle positioning relative to the trigger without help from `overflow`.

## Types, refs, and `'use client'`

React 19 dropped the requirement for `forwardRef`: a function component can declare
`ref` as a normal prop and read `props.ref` directly, and `<Comp ref={x} />` from a caller
still works the same way it always did. That's what makes a from-scratch `Slot`
practical without a `forwardRef` wrapper at every layer. Typing these components well
means extending `ComponentProps<'button'>` (or whichever host element) rather than hand
listing HTML attributes, and accepting that a generic, polymorphic `as`/`render` prop is
one of the harder types to get exactly right — most libraries settle for "good enough,"
not perfect inference. Any primitive that touches the DOM directly (portals, `useId`,
`document.body`) needs a `'use client'` boundary in an RSC app; Base UI and React Aria
Components ship that boundary inside the library so consumers don't have to think about
it, which is one of the concrete advantages of adopting one over hand-rolling.

## Further reading

- [React 19: ref as a prop](https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop)
- [Radix UI: Composition (`asChild`)](https://www.radix-ui.com/primitives/docs/guides/composition)
- [Base UI: the `render` prop](https://base-ui.com/react/handbook/composition)
- [React Aria Components: styling](https://react-spectrum.adobe.com/react-aria/styling.html)
- [WAI-ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
