# The rules, and what ARIA can and cannot do

ARIA — Accessible Rich Internet Applications, currently at [WAI-ARIA 1.3](https://www.w3.org/TR/wai-aria-1.3/) — does exactly one thing: it changes what an element reports to the **accessibility tree**, the parallel structure assistive technology reads instead of the visual page (lesson 55 covered how that tree gets built). ARIA can give an element a role, a name, a state, or a relationship it wouldn't otherwise have. That's the whole surface area.

What ARIA cannot do is give an element behavior. `role="button"` makes something *announced* as a button. It does not make it focusable, does not make Enter or Space activate it, does not give it a focus outline, and does not stop a screen reader user from tabbing past it entirely. Every attribute you saw in lesson 55 — landmarks, `alt`, heading levels — worked because HTML elements ship both the semantics *and* the behavior together. The moment you reach for ARIA, you've opted out of that bundle and taken on the behavior half yourself.

## The rules, in order of how often they get broken

The W3C's [Using ARIA](https://www.w3.org/TR/using-aria/) note states five rules. They're not suggestions — violating one is close to a guaranteed accessibility bug:

1. **If a native HTML element or attribute already has the semantics and behavior you need, use it instead of repurposing another element with ARIA.** A `<button>` beats `<div role="button">` every time, because the `<button>` comes with focusability and keyboard handling for free.
2. **Don't change native semantics unless you really have to.** `<h2 role="button">` is legal ARIA and a bad idea — you've thrown away "this is a level-2 heading" for a role a real `<button>` would have given you with none of the cost.
3. **All interactive ARIA controls must be usable with the keyboard.** If you add `role="button"`, `role="switch"`, or `role="tab"` to something, you have personally taken on the job of `tabindex`, focus styling, and the correct key bindings for that role. The APG (ARIA Authoring Practices Guide) documents which keys each widget role expects — Enter/Space for buttons, arrow keys for tabs and menus, Space for switches and checkboxes.
4. **Never put `role="presentation"` or `aria-hidden="true"` on an element that can receive focus.** Doing so creates a "phantom focus" stop: a screen reader user tabs to something the accessibility tree says doesn't exist. Browsers and some AT try to paper over this, but don't rely on it.
5. **All interactive elements must have an accessible name.** An icon-only button, an input with no visible label, a link that just says "click here" wrapped around an image with no alt — all fail rule 5.

## The roles taxonomy

WAI-ARIA groups every role into six categories, and knowing which bucket a role sits in tells you what it's *for*:

- **Widget roles** — `button`, `checkbox`, `switch`, `slider`, `tab`, `tooltip`. Individual interactive controls.
- **Composite widget roles** — `tablist`, `menu`, `listbox`, `grid`, `combobox`. Containers that manage a group of widget-role children, usually with one shared tab stop and arrow-key navigation inside (lesson 58 covers that pattern — roving `tabindex`).
- **Document structure roles** — `heading`, `list`, `listitem`, `figure`, `table`. Describe how content is organized; mostly non-interactive.
- **Landmark roles** — `navigation`, `main`, `search`, `region`. Covered in lesson 56; let AT users jump between page sections.
- **Live region roles** — `status`, `alert`, `log`, `timer`. Announce content that changes without a page reload — the second half of this lesson.
- **Window roles** — `dialog`, `alertdialog`. Modal-style content layered over the page.

Knowing the category matters because it tells you the required companions. A composite widget role like `tablist` requires its children to be `tab`, and a `tab` requires `aria-selected`. A live region role doesn't take children roles at all — it's a behavior flag on whatever's already there.

## States and properties aren't the same thing

ARIA attributes split into two kinds, and the distinction shows up in the spec name for a reason:

- **States** describe something that changes during the component's life without a page reload: `aria-expanded`, `aria-checked`, `aria-selected`, `aria-pressed`, `aria-disabled`, `aria-busy`. If you're not updating one of these in an event handler, you probably shouldn't have added it.
- **Properties** are largely static, set once and rarely touched again: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-haspopup`, `aria-controls`, `aria-required`.

`aria-describedby` and `aria-details` both point at supplementary content, but they're not interchangeable: `aria-describedby` concatenates the referenced text directly into the description (good for a short hint or error message), while `aria-details` points AT to a *structured* related object — a whole panel, table, or comment thread — that the user can choose to navigate into rather than having it flattened into one string. Reach for `aria-details` when the "description" has its own internal structure worth preserving.

## Anti-patterns you'll see in real codebases

- **Redundant roles.** `<button role="button">` and `<nav role="navigation">` add nothing — the native element already has that role. Harmless to a screen reader, but it's a sign nobody checked whether the ARIA was necessary, and it's dead weight the next person has to reason about.
- **`aria-label` on a plain `<div>` or `<span>`.** These elements have an implicit ARIA role of `generic`, and `generic` does not participate in the browser's accessible-name computation — most browsers **ignore `aria-label` on a bare `div`/`span` entirely.** Give the element a real role (`group`, `region`, `button`, …) first, or label something that can actually carry a name.
- **`aria-hidden="true"` on a focusable element.** Rule 4, and one of the most common axe-core findings in the wild — a hidden element still catches Tab focus, so a screen reader user lands on a stop with no accessible content.
- **`role="menu"` for a site's top navigation.** `menu`/`menuitem` describe an *application* menu (arrow-key navigation, `Escape` to close, one item active at a time) — the pattern under a hamburger icon in a desktop app, not a marketing site's nav links. Using it for navigation forces you to implement arrow-key traversal that visitors don't expect and blocks the browser's native link behavior (open in new tab, copy link) that a real `<nav><a>` gives away for free.
- **`aria-live` on everything that might change.** Treated in depth below — for now: it does not mean "announce this," it means "announce this **every time it changes**," and stacking it everywhere produces a wall of noise that makes users turn their screen reader's speech rate down or disable it for your app.

## Reading APG patterns critically

The [APG's pattern page](https://www.w3.org/WAI/ARIA/apg/patterns/) is the closest thing to an ARIA cookbook, but every pattern assumes you couldn't use a native element — check that assumption first. Some patterns exist mostly to be replaced: the APG's dialog pattern manually implements focus trapping and `aria-modal` that the native `<dialog>` element (with `.showModal()`) now gives you natively, including light-dismiss behavior the popover API adds on top. If a pattern's opening paragraph doesn't say "no native equivalent exists," assume rule 1 applies before you copy the markup.

## Further reading

- [Using ARIA — W3C](https://www.w3.org/TR/using-aria/)
- [WAI-ARIA 1.3 specification](https://www.w3.org/TR/wai-aria-1.3/)
- [ARIA Authoring Practices Guide — Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [MDN: ARIA states and properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes)
