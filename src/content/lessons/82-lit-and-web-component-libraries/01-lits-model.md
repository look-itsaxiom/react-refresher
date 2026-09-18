# Lit's model: reactive properties and efficient templates

Custom elements (lesson 80) and Shadow DOM (lesson 81) are platform primitives, not a framework. Nothing in the spec gives you a render cycle, a way to say "this attribute is really a number," or an efficient way to update the DOM when data changes — `connectedCallback` and `attributeChangedCallback` are all you get. Lit is the layer almost every production web-component codebase adds on top: a small (roughly 5KB core, gzipped) base class plus a tagged-template helper, `html`, that batches updates and patches only what changed. It is not a component model competing with React's — it is closer to what React's class components looked like before hooks, applied to the element you already get from `customElements.define`.

## `ReactiveElement` and reactive properties

`LitElement` extends Lit's `ReactiveElement`, which extends `HTMLElement`. Where lesson 80 had you write `attributeChangedCallback` and `observedAttributes` by hand, Lit generates both from a declaration:

```ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('rating-widget')
class RatingWidget extends LitElement {
  @property({ type: Number, reflect: true }) max = 5;
  @property({ type: Number }) value = 0;
  @state() private hovered = -1;

  static styles = css`:host { display: inline-flex; }`;

  render() {
    return html`<span>${this.value} / ${this.max}</span>`;
  }
}
```

`@property` (or the equivalent `static properties = { max: { type: Number, reflect: true } }` for projects that skip decorators) does three things at once: it defines a getter/setter pair, wires an attribute converter (`type: Number` parses `"5"` to `5`; `Boolean` treats the attribute's *presence* as `true`, matching how `disabled` behaves natively), and — only when `reflect: true` — writes the property back out to the attribute so `::part` selectors and plain CSS attribute selectors can see it. `@state()` is a `property()` with `attribute: false`: internal, not meant to be set from outside, never reflected. This is the same distinction lesson 80 drew between attributes (serializable, HTML-visible) and properties (any JS value) — Lit just automates keeping them in sync in the direction you ask for.

## The update cycle, and why it's asynchronous

Setting a reactive property doesn't render synchronously. It calls `requestUpdate()`, which schedules a microtask; if three properties change in the same tick (as they often do inside one event handler), Lit still renders once. The full sequence per element is:

```
property set → requestUpdate(name, oldValue) → (batched via a microtask)
  shouldUpdate(changed) → willUpdate(changed) → render() → updated(changed)
```

`shouldUpdate` returning `false` skips the render entirely — an escape hatch for an element that wants to bail out under its own logic, not just Lit's default `hasChanged` (which is `!Object.is(old, new)` per property). `willUpdate` runs before `render()`, for computing derived state the template needs; `updated` runs after the DOM is patched, for anything that needs the *new* DOM (measuring, focusing, telling a chart library to redraw). `firstUpdated` is `updated`'s once-only sibling, useful for setup that needs the shadow DOM to exist at all. Every element also exposes `updateComplete`, a promise that resolves once the pending batch has actually painted — the async equivalent of "wait for this render," which matters a lot in tests and in code that reacts to a property change and then immediately needs the new DOM. This whole pipeline is a named, testable version of the reactive-property lifecycle a hand-rolled base class has to reinvent — which is exactly what the next exercise asks you to do, at a smaller scale.

## `lit-html`: template parts, not string diffing

`render()` returns the result of an `html` tagged template, and that's the second half of Lit's value. `html\`<p>${value}</p>\`` doesn't produce an HTML string — the tagged-template call gives Lit access to the static `strings` array separately from the dynamic `values`, and because a given template literal's `strings` array is the *same object* on every call (a guarantee from the JS spec, not a Lit trick), Lit can parse the static structure once, mark exactly where each `${}` landed with a comment or attribute, and on every subsequent render walk only those marked "parts," diffing each value with `Object.is` and touching the DOM only where something actually changed. Compare that to `element.innerHTML = `<p>${value}</p>`` — every render tears down and rebuilds the whole subtree, loses focus and scroll position inside it, re-runs any `<img>` load, and (unless you escape `value` yourself) is an XSS hole the moment `value` contains user input. `lit-html` closes both gaps for free: values bound into text positions are set via text-node data, never parsed as markup, so interpolation is escaped by construction.

Bindings read their target from the syntax: `attr="${v}"` sets a plain attribute, `.prop="${v}"` assigns a JS property directly (for anything that isn't a string — booleans, objects, arrays), and `@event="${handler}"` calls `addEventListener` once and swaps the listener in place if the handler function identity changes, rather than removing and re-adding on every render. Lists use the `repeat` directive with an explicit key function (`repeat(items, i => i.id, i => html\`...\`)`) to reorder existing DOM nodes instead of recreating them — the keyed-list problem lesson 03 covered for React's `key` prop, solved the same way, by hand, at the template layer. `classMap`/`styleMap` turn objects into class lists and inline styles; `ref()` gets you a callback (or object) ref onto a rendered element; `live()` forces a re-check against the *actual* DOM property instead of Lit's last-known value, for the rare case something outside Lit's control (a form autofill, a native `<input>`) changed it first.

## Styling, controllers, context, and beyond the browser tab

`static styles = css\`...\`` compiles to a `CSSStyleSheet` shared across every instance of the element via `adoptedStyleSheets` (falling back to injected `<style>` tags where that's unavailable) — one parsed stylesheet object reused by every instance, not one `<style>` block duplicated into every shadow root. A **reactive controller** is Lit's answer to "how do I share stateful behavior across elements without inheritance": an object with an `hostConnected`/`hostDisconnected`/`hostUpdate` lifecycle that a host element registers via `addController()`, structurally the custom-element equivalent of a custom hook. `@lit/task` builds a controller around an async operation (pending/complete/error render branches, automatic re-run when its dependencies change) — the controller-based answer to what `use()` and Suspense do in React. `@lit/context` provides a `provide`/`consume` pair that crosses shadow boundaries, since `React.createContext` obviously can't. `@lit-labs/ssr` renders Lit templates to a string on the server and emits **declarative Shadow DOM** (`<template shadowrootmode="open">`), so a shadow root exists in the initial HTML payload before any JavaScript runs — the web-components analog of avoiding a hydration flash.

## Further reading

- [Lit docs: Components](https://lit.dev/docs/components/overview/)
- [Lit docs: Reactive properties](https://lit.dev/docs/components/properties/)
- [Lit docs: Lifecycle](https://lit.dev/docs/components/lifecycle/)
- [lit-html: Template syntax](https://lit.dev/docs/templates/overview/)
