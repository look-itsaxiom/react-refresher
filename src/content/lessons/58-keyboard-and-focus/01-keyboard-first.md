# Everything must work with a keyboard

Mouse and touch users get away with sloppy structure because their pointer skips straight to whatever they can see. Keyboard users — and every screen reader user, because screen readers drive focus the same way — walk your DOM one stop at a time. If that walk is out of order, invisible, or gets stuck, the page is broken for them regardless of how it looks. This is WCAG 2.1.1/2.1.2 (keyboard, no trap) and 2.4.3 (focus order), and it's the most-tested thing an accessibility reviewer will do: unplug the mouse.

## Tab order follows DOM order, not the screen

The browser's default tab sequence is the order focusable elements appear in the DOM — full stop. It does not know about `flex-direction: row-reverse`, `grid-template-areas`, `order`, or `position: absolute`. If you use CSS to visually reorder a card's title above its "Edit" button but the button comes first in markup, sighted mouse users see title-then-button while keyboard users tab button-then-title. That mismatch is disorienting at best and, per 2.4.3, a straight WCAG failure.

The fix is almost always to reorder the markup instead of using CSS to fake the order visually. If you truly need visual and DOM order to diverge (rare — maybe a two-column layout where reading order should be column-then-column but display order is row-then-row), you're accepting an accessibility cost; don't do it without a reason.

## `tabindex`: 0, -1, and never positive

Three values matter in practice:

- **No `tabindex` attribute** — the default for interactive elements (`<button>`, `<a href>`, `<input>`, `<select>`, `<textarea>`). They're focusable and in tab order for free. Prefer these over `<div onClick>` whenever the semantics fit; you get keyboard operability, the right accessibility role, and correct `:focus` styling with zero extra code.
- **`tabindex="0"`** — adds a normally non-interactive element (a `<div>` acting as a custom widget) into the natural tab order, in its DOM position. Use this only alongside a real ARIA role and the keyboard handling that role requires (see below) — `tabindex="0"` alone makes something focusable, not operable.
- **`tabindex="-1"`** — removable from the tab sequence, but still focusable programmatically via `.focus()` or as a target for `aria-activedescendant`. This is how you build roving tabindex (concept 2) and how you make a heading or error summary focus-on-demand without cluttering normal Tab traversal.
- **Positive `tabindex` (`1`, `2`, ...)** — don't. It creates a second, hand-maintained tab order that runs *before* the natural one and gets out of sync the moment anyone reorders markup. There is no case in modern layout that positive `tabindex` solves better than fixing the DOM order.

## Focus has to be visible — and not remove-able by habit

WCAG 2.4.7 (Focus Visible, AA) requires *some* visible indicator when an element has focus. WCAG 2.2 raised the bar with 2.4.13 (Focus Appearance, AAA): a focus indicator needs a minimum contrast ratio against its surroundings and a minimum area — a 1px outline in a similar shade to the background technically satisfies 2.4.7 while still being useless. Even if you're targeting AA, treat 2.4.13's numbers as the sanity check for "is this indicator actually visible."

The reflex to avoid: `outline: none` (or `outline: 0`) on `:focus`, applied because the default blue ring clashed with a design. Removing it without a replacement fails 2.4.7 outright and is one of the most common, easily-caught accessibility bugs in the wild. The fix isn't "never touch outline" — it's `:focus-visible`:

```css
/* Bad: no indicator for anyone */
button:focus {
  outline: none;
}

/* Good: your own indicator, shown only when it should be */
button:focus {
  outline: none;
}
button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

`:focus-visible` matches the browser's own heuristic for "this focus probably came from a keyboard (or is otherwise not obviously a mouse click)." A `<button>` clicked with a mouse generally does *not* match `:focus-visible` (mouse users already have the click itself as feedback), but a `<button>` focused by Tab does. Text inputs match `:focus-visible` on click too, since there's no other way to tell a mouse-focused text field is focused. This lets you design your own ring instead of the browser default, without silently deleting it for keyboard users, which is the actual WCAG violation.

## Focus that a sticky header swallows

A fixed or sticky header can visually cover the element that just received focus — you tab to a control, and it scrolls to a position hidden behind the header. WCAG 2.2 added 2.4.11 (Focus Not Obscured, Minimum, AA): the focused element can't be *entirely* hidden by other content. 2.4.12 (AAA) tightens that to *not even partially* hidden. The common, low-effort fix is `scroll-margin-top` on focusable targets (or `scroll-padding-top` on the scrolling container) sized to the header's height, so the browser's built-in scroll-into-view on focus stops short of the header:

```css
main {
  scroll-padding-top: 4rem; /* matches the sticky header's height */
}
```

The same property is worth applying to skip-link targets (lesson 56) for the identical reason.

## Custom widgets have to earn their keyboard behavior

A native `<button>` gets Enter and Space "for free" — the browser fires `click` for both. A `<div role="button" onClick={...}>` gets neither; you'd have to add a `keydown` handler for `Enter` and `Space` yourself, and remember `Space` also needs `preventDefault()` so it doesn't scroll the page. This is the general rule: every native element that's operable by keyboard earned that through built-in behavior you don't see, and every time you reimplement it with a non-native element (a styled `<div>`, a custom dropdown, a drag handle) you've taken on the obligation to reimplement the keyboard behavior too — usually more of it than people expect (arrow keys, Home/End, typeahead). The WAI-ARIA Authoring Practices Guide (APG) documents the exact key bindings expected for each composite pattern (menu, listbox, tabs, toolbar, grid); concept 2 and the roving-tabindex exercise build one of these.

## Testing this without a screen reader

You can catch most of this chapter's failures with just a keyboard: Tab and Shift+Tab through the whole page and confirm the order matches what you see, that focus is always visible, that nothing is skipped that should be reachable, and that nothing swallows focus permanently (a "keyboard trap," 2.1.2 — classic offenders are third-party date pickers and embedded iframes that capture Tab and never give it back). Then, inside any custom composite widget, confirm arrow keys move focus the way the APG pattern says they should. A full pass also needs a screen reader (lesson 60 covers this in depth), because screen readers have two different keyboard modes — **browse mode**, where letters and arrows navigate the *virtual* accessibility tree without touching real DOM focus, and **focus mode** (or "forms mode"), where the widget you've focused gets real keys again. A custom widget that only works in one of those modes is still broken for that population, and it's a different bug class than anything a sighted keyboard-only test will surface.

## Further reading (optional)

- [WCAG 2.2 Understanding Focus Order (2.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WCAG 2.2 Understanding Focus Appearance (2.4.13)](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [MDN: `:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [WAI-ARIA Authoring Practices Guide: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
