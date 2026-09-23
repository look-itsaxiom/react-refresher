# An element is a class

A custom element is a JavaScript class registered with the browser under a tag name. Once
registered, `<x-counter>` is exactly as real as `<button>`: `document.createElement`,
`innerHTML`, `querySelector`, DevTools' Elements panel, and every other DOM API treat it as a
first-class element, not a component-shaped fiction that only React understands. That's the pitch
for the whole track — this lesson covers the registration, lifecycle, and attribute/property
mechanics that every other web-component topic builds on. Shadow DOM and slots are next
lesson; Lit and React 19's native custom-element support come after that.

## Registering one

```ts
class XCounter extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Hello';
  }
}

customElements.define('x-counter', XCounter);
```

`customElements` is a global singleton registry. Two rules on the tag name are enforced, not
stylistic: it must contain a hyphen (`x-counter`, `my-app-header`), and it can't collide with any
of a fixed list of reserved names the HTML spec keeps for possible future built-ins (`annotation-xml`,
`font-face`, and a handful of others). The hyphen requirement exists so the parser can always tell
a custom element from a future standard element without a registry lookup.

The registration itself is a one-way door: `customElements.define` throws
`NotSupportedError` if you call it twice for the same tag, and there is no `undefine`. In a normal
app that's irrelevant — you register once, at module load, and move on. It matters here because
this course's sandbox evaluates your solution module more than once in the same browser tab while
grading; every exercise in this lesson has you export a `define(suffix)` function that builds the
tag name from a caller-supplied suffix, so each check (and the starter, and the solution) can
register its own uniquely-named class instead of colliding on a fixed tag.

## What the constructor can and can't do

The constructor runs the moment the element is *created* — via `document.createElement`,
`new XCounter()`, or the parser encountering the tag — which can happen well before the element is
attached anywhere. The spec places real restrictions on it: you must call `super()` first, you
must not inspect attributes or children (`this.attributes` and `this.childNodes` are guaranteed
empty at this point, since the parser may not have finished populating them), and you must not
add your own attributes or children synchronously. Attaching a shadow root or setting up private
fields is fine; touching the light DOM is not. If you need to read a starting attribute or render
initial content, do it in `connectedCallback` instead.

## Lifecycle callbacks

Four optional methods, called by the browser, cover the whole lifecycle:

- **`connectedCallback()`** — runs each time the element is inserted into a connected document
  (i.e., one attached to `window`). This is not "runs once": moving an element to a different
  parent, or removing and re-appending it, fires `connectedCallback` again. If your setup code
  isn't idempotent — starting a `setInterval`, adding a global listener — reconnecting will stack
  duplicates. That's the bug you'll fix in this lesson's second exercise.
- **`disconnectedCallback()`** — runs when the element is removed from a connected document. This
  is where you undo everything `connectedCallback` set up: clear timers, remove listeners created
  against `window`/`document`, disconnect observers. It must be safe to call more than once (a
  `disconnectedCallback` that unconditionally clears an interval that was already cleared should
  not throw) and it must leave the element in a state where reconnecting works cleanly.
- **`attributeChangedCallback(name, oldValue, newValue)`** — runs whenever an attribute *listed in
  `observedAttributes`* changes, including the initial value present when the element is upgraded.
  Unobserved attributes never trigger it, which is why forgetting to list an attribute in
  `observedAttributes` is the most common reason "my attribute changes don't do anything" bugs
  happen.
- **`adoptedCallback()`** — runs when the element is moved into a different `Document` via
  `document.adoptNode`. Rare in practice; most elements never define it.

```ts
class XCounter extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'step', 'disabled'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    // fires for `value`, `step`, `disabled` — never for e.g. `class`
  }
}
```

## Attributes vs. properties — two views of the same state, one you have to reconcile

Attributes are always strings, live in the HTML/DOM tree, and are what you see in markup and
DevTools. Properties are JavaScript values on the element instance — they can be numbers, objects,
arrays, anything. The built-in elements paper over this with **reflection**: `input.value` is a
property that does *not* reflect to the `value` attribute (by design, so React's controlled inputs
work), while `input.disabled` is a boolean property that *does* reflect to the `disabled`
attribute. Custom elements get none of this for free — you decide, per property, whether it
reflects, and you write both directions yourself:

```ts
get value(): number {
  return Number(this.getAttribute('value') ?? '0');
}

set value(next: number) {
  this.setAttribute('value', String(next)); // property write -> attribute
}
// attributeChangedCallback re-renders when the attribute changes -> property read stays in sync
```

The classic bug here is an infinite loop: a property setter that writes the attribute, whose
`attributeChangedCallback` calls the setter again. Guard it by making the setter idempotent
(setting the same value should not trigger extra work) or by comparing before writing. Boolean
attributes follow HTML's existing convention: presence means `true` regardless of the attribute's
value string, so `disabled=""` and `disabled="false"` are both truthy — test with `hasAttribute`,
never by reading the string.

## Upgrade timing and `:defined`

Parsing an unregistered tag like `<x-counter>` produces a plain `HTMLElement` (technically an
`HTMLUnknownElement`-like fallback) with none of your class's behavior. When `customElements.define`
runs later, the browser **upgrades** every matching element already in the tree — calling the
constructor and `connectedCallback` on each. `customElements.whenDefined('x-counter')` returns a
promise that resolves once that tag is registered, which is how you wait for a lazily-loaded
element before depending on its API. The CSS pseudo-class `:defined` matches elements whose tag
has been registered (built-ins are always `:defined`); pair it with a `:not(:defined)` style to
hide custom elements until they've upgraded, avoiding a flash of unstyled content.

## Customized built-ins — and why you'll rarely see them

The `extends`/`is` form lets you subclass a built-in element instead of `HTMLElement`:

```ts
class FancyButton extends HTMLButtonElement {}
customElements.define('fancy-button', FancyButton, { extends: 'button' });
// <button is="fancy-button">
```

This is the theoretically-correct way to add behavior to a `<button>` while keeping its native
semantics and form participation. In practice, treat it as unavailable: Safari/WebKit has never
implemented customized built-ins and has stated it does not intend to, so any production code
depending on `is=` breaks for every Safari and iOS user. Reach for it only behind a feature check,
or skip it and compose a plain custom element around a native one instead.

## How this looks to a framework

A custom element upgraded in the DOM doesn't know or care whether React, Vue, or nothing rendered
its parent — it's just an element. What differs is how *callers* talk to it: attributes are easy
from any framework (they're just strings in JSX/templates), but rich values, and listening for
custom events, need framework-specific glue. React 19 closed most of that gap for events and
properties; lesson 83 covers exactly what changed and what still needs a `ref`.

## Further reading (optional)
- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: `customElements.whenDefined()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined)
- [WHATWG HTML spec: custom elements](https://html.spec.whatwg.org/multipage/custom-elements.html)
- [web.dev: Customized built-in elements](https://web.dev/articles/custom-elements-v1#extending_native_elements)
