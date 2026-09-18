# Build `<x-card>`

Finish a custom element with a real shadow root: named slots, fallback content, `part`
attributes for external styling, and a `slotchange` listener that reflects the state of a
slotted footer onto the host as a `data-has-footer` attribute.

## The sandbox constraint

`customElements.define` is permanent for the lifetime of the page — you cannot undefine or
redefine a tag. Because this exercise's checks each evaluate your module fresh, a hardcoded
tag name (`customElements.define("x-card", ...)`) would collide on the second check. Instead,
export a **factory**:

```ts
export function define(suffix: string): string {
  const tag = `x-card-${suffix}`;
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement { /* ... */ });
  }
  return tag;
}
```

Every check calls `define(uniqueSuffix)` with its own suffix and gets back a fresh, uniquely
named tag to test against. The starter already has this shape — fill in the class body.

## What the element needs

1. **A shadow root**, attached in the constructor, `mode: "open"`.
2. **Three slots** inside it:
   - `name="title"` — no fallback needed.
   - the **default** (unnamed) slot — for the card's body content.
   - `name="footer"` — with fallback content (e.g. `"No notes yet."`) shown when nothing is
     slotted there.
3. **`part` attributes** on at least two internal elements (e.g. `part="container"` on the
   wrapping element, `part="title"` on the title's wrapper), so a consumer could style them
   from outside with `::part()`.
4. **A `<style>` tag** inside the shadow root that includes:
   - a `:host` rule,
   - a `::slotted(...)` rule,
   - a use of a `--x-card-accent` custom property (with a fallback), so a consumer can theme
     the card by setting `--x-card-accent` on the host from outside.
5. **A `titleText` getter** on the element instance that returns the trimmed text content
   currently assigned to the title slot (empty string if nothing is assigned).
6. **A `data-has-footer` attribute** on the host, `"false"` by default, that flips to `"true"`
   whenever the footer slot's assignment changes to include at least one node (listen for
   `slotchange` on the footer `<slot>` itself), and back to `"false"` if it becomes empty again.
   Set the initial value in `connectedCallback`, not in the constructor — the spec requires a
   custom element to have zero attributes immediately after construction, so `this.dataset...`
   inside the constructor throws.

The default export, `App`, already picks a unique suffix and renders one `<x-card>` instance
using plain DOM APIs (not JSX) so you can see it in the preview — you don't need to touch it.
