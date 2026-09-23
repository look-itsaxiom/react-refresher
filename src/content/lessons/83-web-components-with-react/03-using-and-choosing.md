# Using web components from React, and when to bother

A typed wrapper — the pattern from the previous exercise — is the shape most teams converge on
once React 19's property/attribute rules stop fighting them. It buys three things a raw
`<x-rating>` in JSX doesn't: a place to translate a custom event into a normal callback prop,
a `ref` API that exposes only the methods you want (`useImperativeHandle`, same as any other
component), and one spot to keep intrinsic-element typing out of every call site.

## Two-way binding without a form element

Plenty of web components model a value the way `<input>` does — a property plus a change
event — but aren't `<input>`, so `defaultValue`/`value`/`onChange` don't just work. The
wrapper pattern generalizes directly: hold the "controlled" value in the parent, push it down
as a property every render, and forward the element's custom event back up as a callback. If
you need *uncontrolled* mode too (an initial value the element owns after that), mirror how
`<input defaultValue>` works: set the property once on mount from a `defaultValue` prop and
never touch it again, letting the element's own state drive it from there.

## Slots: `slot` is just an attribute on the child

Named slots are a Shadow DOM feature, not a React one — react-dom already lets any element
(including a React element passed as `children`) carry a `slot` attribute, and the browser's
Shadow DOM projection rules take it from there. `<XCard><h3 slot="title">Plan</h3><p>Body
text</p><span slot="footer">42 seats</span></XCard>` needs no special support from `XCard`
itself; it only needs to render a real custom element with a shadow root that declares
`<slot name="title">`, an unnamed `<slot>`, and `<slot name="footer">`. If a design system's
public API shouldn't leak "pass slot names as attributes," a wrapper can do the assignment for
you — clone each child with `React.cloneElement(child, { slot: mapping[child.key] })` based on
a prop like `<XCard title={...} footer={...}>` — which is what the next exercise's
`assignSlots` helper does in isolation.

## Styling from outside: `::part`

Shadow DOM blocks ordinary descendant selectors, but any element inside a shadow tree that
carries a `part="name"` attribute is stylable from the *outside* with `::part(name)` — from a
plain `.css` file, a CSS Module, or a Tailwind `@layer` rule, no different from styling
anything else React renders. `x-rating::part(track) { accent-color: var(--brand-500); }` works
whether `<x-rating>` came from a design system, a Lit component, or hand-rolled `HTMLElement`
subclass, because `::part` is a CSS feature, not a framework integration point.

## Testing

`@testing-library/react`'s `render` mounts the custom element like anything else; query it with
`screen.getByRole`/`getByTestId` the normal way. To look inside its shadow root, reach in with
`within(el.shadowRoot!)` — `within` accepts any DOM node, and a shadow root is one. Don't reach
for `container.querySelector` across a shadow boundary; `querySelector` doesn't pierce shadow
roots by design, which is exactly the encapsulation Shadow DOM promised.

## SSR and hydration: still the sharp edge

React 19 fixed props; it didn't give custom elements a first-class SSR story. `renderToString`
emits attributes for primitives and omits everything else (Concept 1), which means an object or
function prop simply isn't in the server-rendered HTML for the element to read on first paint —
whatever the element renders before hydration reflects only the primitive attributes it got.
Declarative Shadow DOM (a `<template shadowrootmode="open">` inside the tag, parsed by the
browser into a real shadow root before any script runs) is the platform's own answer to
"render shadow content on the server," but it's the element's own responsibility to emit that
template — React doesn't generate DSD markup for you, and `hydrateRoot` doesn't know anything
about attaching to an existing shadow root either. In practice: SSR-heavy React apps that
need visible custom element content on first paint either accept a flash of unstyled/empty
content until the element's own `connectedCallback` runs client-side, or keep that particular
piece of UI as a plain React component instead.

## When a web component earns its place in a React app

Reach for one when the component has to outlive or outrun a single React app: a design
system shared with a non-React product (an Angular admin, a plain-HTML marketing site), a
micro-frontend boundary where teams ship independently and can't agree on a framework version,
or a long-lived widget (a rich text editor, a map, a video player) you want to embed and
upgrade without a React major-version dependency in the mix. The cost is real: no JSX
type-checking without a wrapper, an SSR/hydration story you have to build yourself, and a
`customElements` registry that's global and can't be un-registered, which makes hot-reloading
and testing noticeably more annoying than a plain component.

Skip it for anything React-only, SSR-first, or that needs deep integration with the rest of
the tree — context, Suspense boundaries, the compiler's memoization, error boundaries. A
custom element is an opaque DOM node to all of that machinery; React can set its properties and
listen to its events, but it can't see inside it the way it sees inside a function component.
If the whole product is React and stays that way, a plain component is less code, not more,
even after this lesson's wrapper pattern.

## Further reading (optional)
- [React 19 release notes: full support for custom elements](https://react.dev/blog/2024/12/05/react-19)
- [MDN: Using shadow DOM — `::part` and CSS shadow parts](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [web.dev: Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom)
- [Lit: `@lit/react` createComponent (the pre-19 wrapper generator)](https://lit.dev/docs/frameworks/react/)
