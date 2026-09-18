## You don't ship pixels to a screen reader

The browser doesn't hand your DOM to assistive technology. It builds a second, parallel tree —
the **accessibility tree** — and that's what screen readers, switch access, and voice control
actually consume. Every node in it has, at minimum, a **role**, a **name**, and a set of
**states and properties**. Your job as a frontend developer is less "write HTML" and more
"produce the accessibility tree you intended," and HTML is just the most direct way to do that.

The tree is derived from the DOM, but it isn't a 1:1 copy:

- **Role** comes from the tag by default (`<button>` → `button`, `<nav>` → `navigation`,
  `<h2>` → `heading` with `level: 2`) or is overridden by an explicit `role="..."` attribute.
  A `<div role="button">` is, as far as any assistive technology is concerned, a button — the
  browser doesn't care that it isn't a real `<button>` element, and neither does the tree.
- **Name** (the "accessible name") is computed by an algorithm, not just "whatever text is
  inside the element." Lesson 41 covers that computation in detail — `aria-labelledby` beats
  `aria-label` beats native labeling (`<label for>`, `<fieldset><legend>`) beats visible text
  content beats type-specific fallbacks like `alt` or `placeholder`. The short version that
  matters here: two elements with identical visible text can end up with different accessible
  names, and an image with no `alt` attribute at all has a role but no name.
- **States and properties** are the dynamic bits — `aria-expanded`, `aria-checked`,
  `aria-current`, `disabled` — that tell assistive tech what's currently true about a node
  without requiring it to re-derive that from your CSS.
- **Relationships** connect nodes across the tree independent of DOM position:
  `aria-describedby` points an error message at its field, `aria-owns` claims a child that isn't
  a DOM descendant, `aria-controls` links a tab to the panel it drives.

## What gets pruned, and how you prune it on purpose

Several mechanisms remove a node — and everything under it — from the accessibility tree
entirely, and they are **not interchangeable**:

- **`hidden` attribute** (or `display: none`) removes the element from the tree *and* from
  layout. Nothing is rendered, nothing is announced.
- **`aria-hidden="true"`** removes an element from the tree while leaving it visually rendered.
  This is the tool for decorative icons sitting next to text that already says the same thing —
  it is *not* a way to visually hide something you still want read aloud; it does the opposite of
  that.
- **`inert`** — a newer HTML attribute — removes a whole subtree from the tree *and* makes it
  unfocusable and unclickable, while still rendering it (typically dimmed). This is what a
  well-built dialog puts on the rest of the page while it's open: everything behind the dialog is
  still visible, but neither focus nor a screen reader's virtual cursor can reach it.
- **`opacity: 0`, `color: transparent`, or clipping tricks** do none of the above. The element
  is still fully present in the accessibility tree with its full name and role — a screen reader
  will happily read text a sighted user can't see. This is a common accidental leak: a developer
  hides something "visually" for a CSS reason and never considers that assistive technology never
  received the memo.

The rule of thumb: if content should disappear for everyone, use `hidden`. If content should stay
visible but silent for assistive tech (pure decoration, a redundant icon), use `aria-hidden`. If
a whole region should visually remain but be fully unreachable (background content behind a
modal), use `inert`. If you only changed opacity or color, you've changed nothing about what a
screen reader announces.

## How screen readers actually navigate

Sighted users scan a page with their eyes — jumping to a heading, skimming a nav bar, glancing at
a button's color to guess whether it's the primary action. Screen reader users get an equivalent
set of shortcuts, but only if the page's semantics support them:

- **Headings list** — most screen readers have a keystroke that pulls up every heading on the
  page as a jump list (NVDA's Elements List, VoiceOver's Rotor). A page with correct, unskipped
  heading levels turns into a table of contents for free; a page built from styled `<div>`s
  offers nothing to list.
- **Landmarks list** — the same idea for `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`,
  and `role="region"` with a label. This is how an experienced screen reader user skips straight
  to the main content instead of tabbing through a header on every single page load.
- **Links list** and **forms list** — every link or every form control, extracted and listed, so
  a user can jump to "Submit" without reading everything in between.
- **Browse mode vs. forms mode** — screen readers on the web run in two modes. Browse mode treats
  the arrow keys as a virtual cursor that walks the accessibility tree node by node (this is how
  a user reads a paragraph without any focusable elements at all). Forms mode hands the arrow
  keys back to the widget itself the moment focus lands on a text input, checkbox, or other
  interactive control, so typing an arrow key moves a cursor in a text field instead of moving
  the virtual cursor to the next node. Getting this transition wrong — most often by trapping
  focus, or by building a custom widget that doesn't switch modes the way a native one would — is
  one of the most disorienting bugs a screen reader user can hit.

None of this is available to a `<div>`-and-`onClick`-built interface. It has no roles to list, no
landmarks to jump between, and no forms mode to enter, because as far as the accessibility tree is
concerned, it's a page of plain, unstructured text with some invisible click handlers attached.

## Inspecting the tree yourself

You don't need a screen reader running to check your work — Chrome ships an inspector for the
tree itself:

- **DevTools → Elements → Accessibility pane** shows the computed accessibility tree for the
  selected node, including its computed role and computed name (the same two fields exposed
  programmatically as `computedrole` and `computedname` in the DevTools protocol, which is what
  automated tools like axe and Testing Library's `getByRole` are effectively reading too).
- **DevTools → More tools → Rendering → "Emulate vision deficiencies"** simulates several forms
  of color blindness and low vision directly in the viewport.
- **Accessibility Insights for Web** (a free browser extension) runs a fuller automated audit and
  a guided set of manual checks (tab order, high-contrast mode) side by side.

Get comfortable reading a computed role and name before you get to ARIA. Most bugs in this track
show up first as "the role or name in that panel isn't what I expected," and the fix is almost
always in the HTML, not in a new `aria-*` attribute.

## The mental model for the rest of this track

Every remaining lesson in this track follows the same priority order, because it's the order
that actually produces working assistive-technology support: **semantics first** (lesson 56 —
the right element usually gives you the right role, name, and keyboard behavior for free),
**ARIA second** (lesson 57 — only reach for it to fill a gap native HTML can't cover, and know the
first rule of ARIA: don't use ARIA if a native element already does the job), and **testing
always** (lesson 60 — because "I think this works" and "a screen reader user can actually
complete this task" are different claims, and only one of them is verifiable).

## Further reading

- [MDN — Accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree)
- [MDN — ARIA: `aria-hidden`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-hidden)
- [web.dev — Inert](https://web.dev/articles/inert)
- [Chrome DevTools — Inspect accessibility](https://developer.chrome.com/docs/devtools/accessibility/reference)
