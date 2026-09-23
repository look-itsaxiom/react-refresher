# Buy the hard parts

Lessons 57 and 58 covered patterns you can and should hand-roll: a disclosure, a switch,
a live region, a focus trap, a roving-tabindex toolbar. Those widgets have a handful of
states and one or two keys to wire up. This lesson closes the accessibility track with
the widgets where hand-rolling stops being a reasonable choice: combobox, menu, listbox,
date picker, tree, and grid.

## Why these fail when hand-rolled

A combobox alone has to get right: the roles and states for the input and its popup, a
keyboard map that differs from a plain listbox (typing filters instead of selecting),
focus that never leaves the input while a virtual "active" option changes, typeahead
that resets after a pause, pointer interaction that has to stay in sync with the keyboard
state, RTL mirroring for arrow keys, and — the part teams underestimate most — screen
reader behavior that is not identical across JAWS, NVDA, and VoiceOver for the same
markup. A team that ships a combobox after a week of work has usually tested it with a
mouse and maybe `axe`, not with a screen reader across browsers. The bugs that remain are
exactly the ones automated tools cannot catch: an option that is visually "highlighted"
but never announced, an `Escape` that closes the popup but leaves a stale
`aria-activedescendant` pointing at a removed node, a filter that fires so often the
screen reader's speech queue falls behind the DOM.

This is not a argument against understanding the pattern — the next concept walks through
the full combobox anatomy, and you should be able to build one from scratch. It is an
argument against re-deriving the fixes for those bugs on every project. A maintained
headless library has already hit them and shipped the fix.

## What a headless library actually gives you

- **Correct roles and states**, wired to the DOM nodes you render, kept in sync as state
  changes (no manually toggling six attributes across three event handlers).
- **A keyboard map implemented once and tested**, including the parts people skip: typeahead
  that resets after a pause, `Home`/`End`, wrapping vs. clamping per pattern.
- **Focus management**: trapping for modals, restoration on close, and the
  activedescendant-vs-real-focus decision made correctly per widget (a listbox inside a
  virtualized list needs `aria-activedescendant`; a small static toolbar can use roving
  `tabindex` — see lesson 58).
- **Cross-screen-reader testing** the library authors have already done, so the fix for "NVDA
  double-announces this state" ships as a library update, not a ticket in your backlog.
- **Composability**: you get unstyled primitives (a `<Combobox.Input>`, a `<Combobox.Item>`)
  that render whatever markup and CSS you want, so adopting the library never means fighting
  your design system.

## What they leave to you

No library writes your `aria-label` text, judges your color contrast, decides your empty-state
copy, or picks your content hierarchy. It also will not stop you from composing the pieces
into something incoherent — a combobox with no visible label, or a menu triggered by a `div`
with no accessible name. The library gets you a correct state machine; you still own labels,
contrast, and content.

## The 2026 landscape

- **Base UI** (from the team behind MUI, joined by several of the original Radix authors) is
  the library most new projects reach for by default in 2026. It aims to be the single unstyled
  primitive layer underneath both MUI's own components and community tooling. Check the current
  shadcn/ui docs for which primitive layer a fresh `shadcn init` scaffolds today — the ecosystem
  has been moving toward Base UI, but confirm the default before assuming.
- **Radix UI** (`@radix-ui/react-*`) is stable and still widely deployed, but new feature work
  has largely moved to Base UI. Treat existing Radix codebases as fine to keep, and treat new
  projects as a case for evaluating Base UI first.
- **React Aria** (Adobe, `react-aria-components` for the unstyled/composable layer, or the
  lower-level `react-aria` hooks like `useComboBox` if you want to own every DOM node) has the
  deepest published screen reader test matrix of any of these — Adobe's own design system,
  Spectrum, is built on it and dogfoods the same code. The API surface is larger than the
  others; you're trading some verbosity for the most battle-tested behavior.
- **Ariakit** covers a broad set of widgets (including combobox, menu, and a full APG-conformant
  select) with a composable, hook-and-component API, and is a reasonable alternative to
  evaluate alongside Base UI and React Aria.
- **Headless UI** (Tailwind Labs) covers a smaller widget set — menu, listbox, combobox, dialog,
  disclosure, switch — the pattern is: pair it with Tailwind, keep the API small. Fine for that
  smaller set; reach for one of the others once you need trees, grids, or date pickers.

## The native answer arriving underneath all of this

CSS's customizable `<select>` (`appearance: base-select` plus the `<selectedcontent>` element)
lets you style a native `<select>`'s popup and put arbitrary markup inside its `<option>`s while
keeping the browser's own keyboard handling, focus management, and screen reader behavior for
free — no library required. Support is landing unevenly across engines; check the current
caniuse/MDN status before relying on it for anything you ship broadly. For a much lighter case —
a plain text input with a few suggested completions, no custom option content, no rich filtering
— the long-standing native `<datalist>` element is worth reaching for before any library at all.

## How to evaluate a library before adopting it

1. **Does it implement the WAI-ARIA APG pattern for the specific widget**, not just "similar"
   roles? Check the library's own docs against
   [the APG pattern page](https://www.w3.org/WAI/ARIA/apg/patterns/) for that widget.
2. **Is there published evidence of screen reader testing** (which combinations of NVDA, JAWS,
   VoiceOver, and browser)? A library with no stated test matrix is a library you'll be testing
   yourself.
3. **Is it actually unstyled and composable**, or does it ship opinionated markup that fights
   your CSS? Try rendering one component with your own class names before committing.
4. **What's the maintenance signal** — release cadence, open issue triage, whether the roles/
   states get updated when the APG itself changes?

## Further reading (optional)

- [WAI-ARIA Authoring Practices Guide: Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Base UI](https://base-ui.com/)
- [React Aria (Adobe)](https://react-spectrum.adobe.com/react-aria/)
- [MDN: Customizable select elements](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_forms/Customizable_select)
