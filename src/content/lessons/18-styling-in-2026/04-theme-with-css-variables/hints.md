Wrap the whole returned JSX (the `<style>`, the button, and the `<section>`) in a single
`<div data-theme={theme}>` instead of the `<>...</>` fragment. `data-theme` needs to live
on a real DOM element for both the CSS selector and the tests to find it.
---
Inside the `<style>` template string, add two rule blocks:
`[data-theme="light"] { --card-bg: ...; --card-fg: ...; }` and the same selector with
`"dark"` and different values. These variables will be visible to any descendant of the
element carrying that `data-theme` attribute — including the card — because CSS custom
properties inherit down the tree.
---
Change the card's `style` object from hardcoded hex strings to
`backgroundColor: 'var(--card-bg)'` and `color: 'var(--card-fg)'`. The card doesn't need
its own `data-theme` — it just needs to be a descendant of the element that has one.
