# Build React Native's primitives, rendered to the DOM

React Native isn't importable here — there's no native runtime in this
sandbox, and there wouldn't be a native surface for it to draw on even if
there were. What you're building instead is a **miniature of its
component model**: the same four primitives (`View`, `Text`, `Pressable`,
`StyleSheet.create`) and the same `Platform` API, implemented in plain
React and rendered to real DOM elements, following React Native's actual
rules for how each one behaves. Solving this exercise is solving the same
shape of problem you'd solve in a real React Native codebase — just
rendered where this course's checks can see it.

## What to implement

### `StyleSheet.create(styles)`

In real React Native this exists mostly for perf (each style object gets
an ID once, rather than re-allocated per render). For this miniature, it
can simply return what it's given, typed so callers get their style
object shape back.

### Style flattening

Every primitive below accepts `style` as either a single style object, or
an **array** of them (React Native's way of composing styles, since there
is no CSS cascade to fall back on). Flattening rules:

- Flatten left to right: later entries override earlier ones on a
  per-property basis (a plain shallow merge in array order).
- Falsy entries (`false`, `null`, `undefined`) are skipped entirely —
  this is what makes `style={[base, isActive && activeStyle]}` a valid,
  common pattern.

Write one `flattenStyle` helper and reuse it in every primitive below.

### `View`

Renders a `<div>`. Regardless of what style the caller passes, a `View`
always applies React Native's real layout defaults first — `display:
'flex'`, `flexDirection: 'column'`, `boxSizing: 'border-box'` — and then
layers the caller's flattened style on top (so a caller can override
`flexDirection` if they need to, but never has to set the other two
defaults themselves).

`View` enforces React Native's actual rule about text: **a raw string (or
number) child is not allowed.** If a `View` receives one directly (not
wrapped in `Text`), throw an `Error` with a message that clearly explains
the rule — e.g. mentioning that text must be wrapped in a `Text`
component. This is a real React Native runtime error, not a lint
warning; make it a real thrown error here too.

### `Text`

Renders a `<span>`. No layout defaults of its own beyond what's passed in
— just flattens `style` and renders the children.

### `Pressable`

Renders a `<button>`, with an `onPress` prop instead of `onClick`. Its
`style` prop can additionally be a **function** of the current press
state — `(state: { pressed: boolean }) => Style` — matching React
Native's real `Pressable` API, so callers can style the pressed state
without local state of their own. Track "pressed" for as long as the
pointer is down over the button (pointer down → pressed; pointer up or
pointer leaving the button → not pressed) and pass the current
`{ pressed }` into the style function on every render.

### `Platform`

A `PlatformProvider` component takes an `os: 'ios' | 'android' | 'web'`
prop and makes it available to descendants; default to `'web'` when no
provider wraps a component. Expose a `usePlatform()` hook returning
`{ OS, select }`, where `OS` is the current platform and `select` is a
function:

```ts
select<T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined
```

`select` picks the entry matching the current `OS`, falling back to
`default` when there's no entry for that platform.

## Ship something visible

The starter's default `App` already uses all four primitives plus
`usePlatform`, wrapped in a `PlatformProvider`. Once the primitives work,
it should render without throwing and show platform-specific text.
