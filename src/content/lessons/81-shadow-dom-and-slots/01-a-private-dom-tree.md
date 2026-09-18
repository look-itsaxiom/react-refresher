# A private DOM tree

You already know how to build a custom element: `customElements.define`, a class extending
`HTMLElement`, and the lifecycle callbacks. What that element renders so far is **light DOM**
— the same tree as everything else on the page. Its children are ordinary nodes, its `<style>`
tags leak out, and a global `.card { padding: 2rem }` from some other team's CSS can reach in
and break it. Shadow DOM is the fix: it gives an element its own DOM subtree that is invisible
to `document.querySelector`, unreachable by ordinary CSS selectors, and free to define its own
internal structure without colliding with anything else on the page.

## Attaching a shadow root

```ts
class XCard extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<div part="container"><slot></slot></div>`;
  }
}
customElements.define("x-card", XCard);
```

`attachShadow` can only be called once per element, and it must happen before you touch
`this.shadowRoot` (calling it a second time throws). The `mode` option is the first real
decision:

- **`"open"`** — `element.shadowRoot` is accessible from outside. `element.shadowRoot.querySelector(...)`
  works, dev tools show the tree, and libraries like Testing Library can reach in via
  `within(host.shadowRoot)`.
- **`"closed"`** — `element.shadowRoot` returns `null` from outside the class. The element's
  own code still has the reference it got back from `attachShadow`, so it isn't actually
  hidden from the world — `element.attachShadow` doesn't exist to call twice, but plenty of
  closed roots have been reached anyway through prototype patching or `Element.prototype.attachShadow`
  overrides captured before the element upgraded. Treat `closed` as "please don't", not as a
  security boundary. Almost every published web component (`<model-viewer>`, Shoelace, Material
  Web) ships `open` roots, because closed roots block exactly the tooling — devtools, test
  queries, other libraries reading structure — that you want available. Reach for `closed` only
  when you are actively defending against sibling code on the same page poking at your
  internals, and even then, know that it raises the bar rather than removing it.

A related option, `delegatesFocus: true`, changes what happens when something calls
`.focus()` on the host or the user clicks it: instead of nothing happening (custom elements
aren't focusable by default), focus moves to the first focusable descendant inside the shadow
tree, and `:focus` / `:focus-within` styling on the host tracks that inner focus. It's the
right default for anything that wraps a native form control — a custom `<x-search>` that
contains a real `<input>` should focus that input, not require the caller to know the internal
selector.

## Composition with `<slot>`

A shadow root that only ever shows content the element itself creates is a dead end — every
consumer needs to pass in a title, a body, some actions. `<slot>` is how content from the
**light DOM** (the element's actual children, written by whoever uses `<x-card>`) gets projected
into specific spots in the shadow tree:

```html
<!-- inside the shadow root -->
<slot name="title"></slot>
<slot></slot>
<!-- default slot -->
```

```html
<!-- light DOM, written by a consumer -->
<x-card>
  <span slot="title">Q3 report</span>
  <p>Revenue is up.</p>
</x-card>
```

The `<span>` is *assigned* to the slot named `title`; anything without a `slot` attribute falls
into the single unnamed (default) slot. Nothing is actually moved — the nodes stay in the light
DOM and in the accessibility tree at their original position; the slot only changes where they
are *painted*. A slot with no assigned nodes renders its own children as fallback content:

```html
<slot name="footer">No notes yet.</slot>
```

Two APIs let you react to slotted content programmatically. `slot.assignedNodes()` (or
`assignedElements()` to skip text nodes) returns what's currently projected into that slot.
The `slotchange` event fires on the `<slot>` whenever that assignment changes — a consumer adds,
removes, or reorders a slotted child. It does **not** fire for changes *inside* an already-slotted
node (editing the `<span>`'s text doesn't fire it); it only fires when the *set* of assigned
nodes changes.

## Querying and events across the boundary

`document.querySelector` cannot see into a shadow root — that's the whole point. To read
inside one you go through the host: `host.shadowRoot.querySelector(...)`. Testing Library
follows the same rule: `screen.getByRole` searches light DOM only, so testing shadow content
means `within(host.shadowRoot).getByRole(...)`.

Events are trickier, because they have to appear to bubble sensibly to code outside that never
knew the shadow tree existed. An event dispatched inside a shadow root that reaches the host
boundary is **retargeted**: listeners outside see it as if it came from the host element itself,
not from whatever internal node actually fired it — `event.target` is silently rewritten. This
protects encapsulation (outside code never learns your internal DOM structure) but it means
`event.target` and `event.composedPath()[0]` disagree once you cross a boundary; use
`composedPath()` when you need the real origin. Only events whose `composed` flag is `true`
cross the boundary at all — most native UI events (`click`, `input`, `focus`) are `composed`,
custom events are not by default, so a `new CustomEvent("saved")` dispatched inside a shadow
root won't be observable outside unless you construct it with `{ composed: true }`.

## What encapsulation buys you — and what it doesn't

Shadow DOM gives you two real guarantees: **style scoping** (a page-level stylesheet's ordinary
selectors don't match into the shadow tree, and the tree's own `<style>` doesn't leak out) and
**DOM scoping** (`querySelector`, `innerHTML` dumps, and generic "grab every div" scripts don't
see inside). It does not give you a security boundary — script running on the same page can
still call `attachShadow` overrides, walk `composedPath()`, or, for open roots, just read
`shadowRoot` directly. Don't put anything in a shadow root because you want it *hidden*; put
things there because you want them *encapsulated* from accidental collisions.

One real cost of that scoping shows up in accessibility: ARIA relationship attributes like
`aria-labelledby` and `aria-describedby` work by ID reference, and ID references cannot cross
a shadow boundary — an element inside a shadow root cannot label an element in the light DOM
(or a different shadow root) by ID, because IDs are only unique, and only resolvable, within
one tree. This is a known, unresolved rough edge of the platform. The proposed fix — sometimes
called a "reference target" — would let an element point at another tree's node directly instead
of by ID string, but as of this writing it is still an early-stage explainer, not shipped
behavior in any browser. Today, the practical workaround is to keep the labelling relationship
inside one tree (put the label in the shadow root next to what it labels) or fall back to
`aria-label` with a plain string instead of a reference.

## Further reading

- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [MDN: Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)
- [MDN: `Element.attachShadow()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow)
- [MDN: `HTMLSlotElement.assignedNodes()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSlotElement/assignedNodes)
