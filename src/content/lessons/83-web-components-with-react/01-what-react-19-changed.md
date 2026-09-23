# What React 19 changed for custom elements

Before React 19, rendering a custom element from React meant fighting the framework. React
treated every prop on every host tag — DOM elements and custom elements alike — as an
**attribute**: it called `setAttribute`, which stringifies everything. A `<x-rating value={3} />`
sent the string `"3"` down, never the number `3`. Passing an object, a `Map`, or a function
as a "property" a web component expected simply didn't work; the usual fix was a `ref` and a
`useEffect` that manually set `el.value = 3` after every render, plus a second effect wiring up
`addEventListener` for the element's custom events, plus cleanup for both. Libraries like
`@lit/react`'s `createComponent()` existed specifically to auto-generate that ref/effect
boilerplate so consumers of a Lit-based design system didn't have to write it by hand for every
element. [React's own 2024 recap of the problem](https://react.dev/blog/2024/12/05/react-19)
puts it plainly: "using Custom Elements in React has been difficult because React treated
unrecognized props as attributes rather than properties."

React 19 removes the need for that wrapper ceremony by changing the rule for **host elements
whose tag name is unrecognized** (i.e., not a built-in DOM element) — which is exactly what a
custom element registered with `customElements.define` looks like to React.

## Property vs. attribute, decided at render time

For a custom element, React now inspects the actual element instance before deciding how to
apply each prop, client-side:

- If the prop's name matches an existing **property** on the element instance (an accessor or a
  plain field on the class — e.g., a `get value()`/`set value()` pair, or `max = 5`), React sets
  it as a **property**: `el.value = 3` keeps the number a number; an object or array prop is
  assigned by reference, not stringified.
- If there's no matching property, React falls back to the old behavior: it sets an
  **attribute** via `setAttribute`, coercing the value to a string. `true` becomes an empty
  attribute (present, no value — the standard boolean-attribute idiom); `false` removes the
  attribute entirely; `null`/`undefined` also omit it.

This is a per-prop decision, made against the live instance, every render. It's why the starter
element in this lesson's first exercise (`<x-rating>`) defines `value` and `max` as real class
properties: that's what makes `<Rating value={3} />` land as `el.value = 3` instead of
`el.setAttribute('value', '3')`.

Two props stay special-cased the way they always have been on ordinary DOM elements:
`className` maps to the element's inherited `className` property (which itself reflects to the
`class` attribute — this predates React 19), and a `style` object is still applied as a style
string, not assigned as a raw object property.

## Server rendering can't inspect an instance

`renderToString` has no DOM, so it can't check "does this custom element's class define a
`value` property." React falls back to a simpler, type-based rule for SSR: primitive values
(`string`, `number`, or `true`) render as attributes; everything else — `false`, `null`,
objects, functions — is **omitted** from the markup entirely. That means a number or boolean
prop round-trips through SSR as a string attribute, and the client-side hydration pass is what
actually turns it back into a property once React re-evaluates the element against its real
class definition in the browser. Non-primitive props (objects, callbacks) simply don't exist
until the client takes over — there is no way to serialize them into HTML, so plan accordingly
if a custom element needs an object prop before hydration finishes.

## Events: exact string match, not a naming convention

The other half of the old pain was events. Web components conventionally dispatch
`CustomEvent`s with kebab-case names — `rating-change`, `item-selected` — because DOM event
names aren't camelCased. React 19 will attach a real `addEventListener` for any prop whose name
starts with `on` and whose value is a function, on an unrecognized (custom) element, using
**the exact remainder of the prop name, verbatim, as the event type**. There's no
kebab-to-camelCase translation: a prop named `onXChange` does **not** listen for `x-change`,
because the remainder `XChange` doesn't equal the event type `x-change` as a string. A prop
named `onrating-change` **does** listen for `rating-change`, because `rating-change` is exactly
what's left after stripping `on` — and `onrating-change` is legal JSX (hyphenated attribute
names are already allowed for `data-*`/`aria-*`). React removes the listener on cleanup when
the prop changes identity or disappears on a later render, the same as it always has for
`onClick` and friends. This exact-match behavior is what [custom-elements-everywhere.com](https://custom-elements-everywhere.com/)
means when it says React 19 supports "lowercase, camelCase, kebab-case, CAPScase, and
PascalCase events" — it isn't guessing a convention, it's matching whatever string you wrote
after `on`.

In practice this means a component's *public* API (an `onChange` prop, say) rarely matches a
custom element's *internal* DOM event name directly, so most real wrapper components still
attach the listener manually — a `ref` callback or a `useEffect` that calls
`addEventListener('rating-change', handler)` and returns the matching `removeEventListener` for
cleanup. The exact-match auto-binding is genuinely useful when you control the event's name and
are fine spelling `onrating-change` in JSX, or when the component only needs to forward a
single, oddly-named event without transforming its payload.

## What still needs a ref

None of this replaces refs. You still need one to call an imperative method (`el.reset()`),
read a value that hasn't been passed down as a controlled prop, or set a non-serializable value
(a `Map`, a callback bag) before the element has connected to the DOM — React's property
assignment happens after the node exists, same as any other DOM ref. Typing an intrinsic
element in JSX (so `<x-rating value={3} />` type-checks without a cast) is a module
augmentation: `declare module 'react' { namespace JSX { interface IntrinsicElements { 'x-rating': { value?: number; max?: number } & DetailedHTMLProps<...> } } }` in `@types/react` 19's ambient namespace. Most teams skip this
and instead write one small typed wrapper component — which also gives them a place to put the
ref-based event wiring — rather than teach every consumer the raw element's quirks. That's the
pattern the next exercise builds.

## Further reading (optional)
- [React 19 release notes: full support for custom elements](https://react.dev/blog/2024/12/05/react-19)
- [Custom Elements Everywhere — React results and event-matching rules](https://custom-elements-everywhere.com/)
- [MDN: CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
