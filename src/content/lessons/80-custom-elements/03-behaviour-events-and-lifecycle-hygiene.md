# Behaviour, events, and lifecycle hygiene

A custom element that only renders is a template with extra steps. The interesting half is
behavior: telling the outside world something happened, and cleaning up correctly when the
element leaves the tree. Both are places where custom elements demand more discipline than a
React component, because nothing (no reconciler, no effect-cleanup contract) is enforcing it for
you.

## Dispatching events

Talk to the outside world with `CustomEvent`, not a callback prop — there's no such thing as a
prop on a raw DOM element, and event listeners are how every native element communicates:

```ts
this.dispatchEvent(
  new CustomEvent('x-change', {
    detail: { value: this.value },
    bubbles: true,
    composed: true,
  }),
);
```

Three options matter:

- **`detail`** carries your payload — any structured value, not just strings. This is the
  equivalent of a callback's argument.
- **`bubbles: true`** lets ancestors catch the event without attaching a listener directly to your
  element — the same reason `click` bubbles. Custom events default to `bubbles: false`, unlike
  native UI events, so you opt in explicitly whenever a delegated listener should see it.
- **`composed: true`** lets the event cross a shadow boundary and continue bubbling into the light
  DOM outside it. It's meaningless for a light-DOM-only element (this lesson's), but it's the
  right default to set anyway: once you or a consumer wraps the element in shadow DOM (next
  lesson), an event that forgot `composed: true` silently stops working for any listener outside
  the shadow root.

Name events like DOM events: lowercase, hyphenated if multi-word, and namespaced enough to avoid
colliding with a future standard event (`x-change` rather than `change` — `change` is already a
native event type, and firing your own on top of it confuses any code listening for the real
one). Fire events for *user-driven* changes, the same way `<input>` fires `change` when a person
edits it but not when your code sets `.value` — programmatic property/attribute writes should
update state silently. A consumer setting a property shouldn't get an event echoing their own
write back at them.

## Cleanup and idempotency

`connectedCallback` and `disconnectedCallback` are not "mount" and "unmount" in the React sense of
running exactly once each. An element can connect, disconnect, and reconnect any number of times
(moving it in the DOM, a parent re-rendering it into a different position) and each transition
calls the matching callback. Two rules make that safe:

1. **Everything started in `connectedCallback` gets undone in `disconnectedCallback`** — timers
   (`clearInterval`/`clearTimeout`), listeners added to `window`/`document` (never to `this`,
   which native GC handles), and observers (`disconnect()`). Miss one and every reconnect leaks
   another copy.
2. **`disconnectedCallback` must be idempotent** — safe to call when there's nothing to clean up.
   The simplest way is to null out the field after cleaning it and guard on that:

```ts
#controller: AbortController | null = null;
#intervalId: number | undefined;

connectedCallback() {
  this.#controller = new AbortController();
  window.addEventListener('resize', this.#onResize, { signal: this.#controller.signal });
  this.#intervalId = window.setInterval(() => this.#tick(), 1000);
}

disconnectedCallback() {
  this.#controller?.abort();
  this.#controller = null;
  window.clearInterval(this.#intervalId);
  this.#intervalId = undefined;
}
```

`AbortController` is worth defaulting to for any listener added in `connectedCallback`: one
`abort()` in `disconnectedCallback` removes every listener registered against that signal, so you
can add as many as you like in connect without hand-pairing each with its own `removeEventListener`
call in disconnect.

## Form participation

A custom element can act like a real form control — appearing in `form.elements`, participating
in `<form>` submission and `FormData`, and getting native validity UI — by opting into
`ElementInternals`:

```ts
class XRating extends HTMLElement {
  static formAssociated = true;
  #internals = this.attachInternals();

  #setValue(v: string) {
    this.#internals.setFormValue(v);
    this.#internals.setValidity(v ? {} : { valueMissing: true }, 'Pick a rating');
  }
}
```

`static formAssociated = true` is what makes the browser treat the element as a form control at
all; `attachInternals()` then hands you `setFormValue` (what gets submitted), `setValidity` (native
constraint-validation integration — `:invalid`, `reportValidity()`, the works), and read access to
the owning `<form>`. `ElementInternals` reached Baseline "widely available" status in March 2023 (all
major engines shipped it, Safari last), so it's safe to use without a fallback in any app
targeting current browsers. `adoptedStyleSheets` and full declarative shadow
DOM matter more for the next lesson; jsdom, notably, does not implement `ElementInternals` at all,
so form-associated behavior can only be exercised in a real browser, not in this course's
jsdom-graded checks.

## Accessibility

A custom element gets **no implicit ARIA role** — `<x-counter>` is as invisible to a screen reader
as a bare `<div>` unless you give it one. `ElementInternals` also exposes ARIA reflection
(`internals.role`, `internals.ariaLabel`, etc.) so a form-associated or otherwise semantic element
can expose the right role without the consumer having to remember to add `role="..."` in markup.
Delegating focus into a shadow root (`delegatesFocus`) is a shadow-DOM concern for next lesson;
without shadow DOM, focus behaves exactly like it does for any other light-DOM children.

## Scoped registries and testing

`customElements` is a single global registry per document today — exactly the constraint this
course's checks work around by generating a unique tag per test. A scoped-registries proposal
(letting you create an isolated `CustomElementRegistry` for part of a tree, so two versions of the
same design system don't collide) has been discussed in the WHATWG/W3C Web Components CG for
years; check the proposal's repo and caniuse before relying on it shipping in any particular
browser, since its implementation status moves and is easy to get wrong from memory.

Testing Library works on custom elements exactly as it does on native ones — `getByRole`,
`getByText`, `fireEvent`, and `user-event` all operate on real DOM, because that's what a custom
element is. The one thing you must do that a React-only test suite never has to think about: give
each test run its own tag name (a random suffix works well), because `customElements.define` can't
be called twice for the same tag and there's no teardown that un-registers one.

**Further reading**
- [MDN: `CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [MDN: `ElementInternals` (Baseline: widely available, since March 2023)](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)
- [web.dev: More capable form controls](https://web.dev/articles/more-capable-form-controls)
- [MDN: `AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
