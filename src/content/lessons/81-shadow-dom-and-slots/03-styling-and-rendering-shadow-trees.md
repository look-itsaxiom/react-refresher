# Styling and rendering shadow trees

Once markup crosses a shadow boundary, ordinary CSS selectors stop working across it in both
directions. A page stylesheet can't reach in with `.card p { ... }`, and a shadow root's own
`<style>` can't reach out. That's the whole point — but a component still needs a *public*
styling API, because "completely unstylable from outside" is as useless as "no encapsulation
at all." Shadow DOM ships four ways to poke a controlled hole in the wall.

## Styling the host from inside

`:host` selects the shadow host element from inside its own shadow root — it's how a component
styles itself:

```css
:host {
  display: block;
  border-radius: 8px;
}
```

`:host(.selector)` is the conditional form — it matches the host only when the host itself
matches `.selector`, letting a component change its own internal styling based on a class or
attribute the *consumer* set on it (`:host([disabled])`, `:host(.compact)`). `:host-context(.selector)`
went further — matching the host based on any ancestor outside the shadow root — but it shipped
only in Chromium, was never adopted by Firefox or Safari, and was removed from the CSS Shadow
Parts spec; treat it as effectively dead. The supported alternative is a CSS custom property
(below) or a `data-*`/class attribute the parent explicitly sets on the host.

## Styling slotted content and internals from outside

`::slotted(selector)`, used inside the shadow root, styles light-DOM nodes *after* they've been
projected into a slot — but only the slotted element itself, not its descendants
(`::slotted(p) span` doesn't work). It's the component author's tool for putting light-touch
styling on whatever a consumer hands it, without needing the consumer to know any internal
class names.

The other direction — a consumer styling something *inside* the shadow root — needs the
component author to opt in explicitly. Mark an internal element with a `part` attribute:

```html
<div part="container">
  <h2 part="title"><slot name="title"></slot></h2>
</div>
```

and outside code can target it with `::part()`:

```css
x-card::part(title) {
  font-weight: 700;
}
```

`part` names are the component's real public styling surface — treat them like a stable API,
not an implementation detail. If a component nests another custom element internally and wants
that inner element's parts to be reachable from the outermost consumer, it re-exposes them with
`exportparts="inner-part-name"` on the nested element's usage site. Without `exportparts`, parts
don't automatically forward through nesting.

CSS custom properties are the fourth channel, and the one most component libraries lean on for
theming, because unlike `part`, they cross the boundary in *both* directions without an explicit
attribute — a custom property is inherited like any other, straight through shadow roots:

```css
/* light DOM */
x-card { --x-card-accent: #2563eb; }
```

```css
/* inside the shadow root */
[part="title"] { color: var(--x-card-accent, #1a1a1a); }
```

This is why design systems built as web components (Shoelace, Material Web, most Salesforce
Lightning components) expose a documented set of `--sl-color-*`/`--md-sys-*` custom properties
rather than a big `part` list — properties compose better with a theming layer, while `part`
is better for one-off overrides.

## Sharing stylesheets without duplicating text

The straightforward way to style a shadow root is a `<style>` tag inside it — simple, and it's
what most hand-rolled components do. Its cost shows up at scale: if you render five hundred
`<x-card>` instances, each with its own `<style>` block, the browser parses and stores that CSS
five hundred times. **Constructable stylesheets** fix this: build one `CSSStyleSheet` and hand
the same object to every shadow root's `adoptedStyleSheets`.

```ts
const sheet = new CSSStyleSheet();
sheet.replaceSync(`:host { display: block; } [part="title"] { font-weight: 600; }`);

class XCard extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [sheet];
    root.innerHTML = `<div part="container"><h2 part="title"><slot name="title"></slot></h2></div>`;
  }
}
```

The sheet is parsed once, and every adopting root shares the parsed representation — this is
the same trick Lit and most modern component libraries use under the hood for their static
styles. `adoptedStyleSheets` is an array, not a single sheet, so a component can adopt a shared
base sheet plus its own instance-specific one.

## Declarative Shadow DOM and SSR

All of the above assumes JavaScript has run and called `attachShadow`. On first paint, before
your bundle executes, a server-rendered custom element is just an empty host tag — a visible
flash of unstyled, unstructured content. **Declarative Shadow DOM** (DSD), Baseline-supported
across major browsers since February 2024, closes that gap by letting the *HTML itself* carry
a shadow root:

```html
<x-card>
  <template shadowrootmode="open">
    <style>:host { display: block; }</style>
    <div part="container"><slot name="title"></slot></div>
  </template>
  <span slot="title">Q3 report</span>
</x-card>
```

The parser sees `<template shadowrootmode="...">` as a special instruction: instead of leaving
an inert `<template>` element in the tree, it attaches a real shadow root to the parent and
moves the template's content into it — synchronously, during HTML parsing, before any script
runs. This is exactly how a server-rendering framework (Lit SSR, or React/Next when rendering
web-component-based design systems) avoids a flash of unstyled content: the server emits the
`<template shadowrootmode>` block directly in the HTML response.

The catch for anything testing or polyfilling this: **the browser's HTML parser** does the
attaching. Setting `.innerHTML` on an element to a string containing `<template shadowrootmode>`
does not trigger it (`innerHTML` isn't the streaming HTML parser), and jsdom — which many test
setups run on — doesn't implement DSD parsing at all. Libraries that need to support both real
browsers and non-parser environments ship a manual **hydration** step: walk the DOM for
`template[shadowrootmode]` elements that never got parsed into real shadow roots, call
`attachShadow` by hand, and move the template's `content` into it.

## `<template>` and `cloneNode` outside of DSD

Independent of shadow DOM, `<template>` is the platform's "parsed but inert, and not part of
the live document" container. Its `.content` is a `DocumentFragment` — cloning it with
`cloneNode(true)` and appending the clone is measurably cheaper than parsing an equivalent
`innerHTML` string on every instantiation, because the template's markup is parsed exactly once
regardless of how many times you clone it. This is the standard pattern inside a custom
element's constructor: build (or import) one `<template>`, clone its `content` into each new
shadow root, and avoid a fresh HTML-parse per instance.

## Testing shadow trees

Testing Library's queries operate on light DOM by design — `screen.getByRole` will not find
anything inside a shadow root, because `document.querySelector` can't either. The fix is the
same one you'd use in application code: get a reference to the shadow root and scope the query
to it, `within(host.shadowRoot!).getByRole("button")`. For components using DSD, remember that
jsdom (Vitest's default DOM) won't parse `shadowrootmode` from a string — if a test builds HTML
via `innerHTML` or `render()` and expects a shadow root to already exist, it needs the manual
hydration step described above, not the parser shortcut a real browser gets for free.

## Further reading

- [MDN: `HTMLTemplateElement.shadowRootMode`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement/shadowRootMode)
- [MDN: `CSSStyleSheet` (constructable stylesheets)](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet)
- [MDN: `::part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part)
- [web.dev: Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom)
