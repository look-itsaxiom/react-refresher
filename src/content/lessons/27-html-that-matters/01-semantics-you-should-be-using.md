# Semantics you should be using

You've spent years writing `<div onClick={...}>` because a design needed something to click
and CSS could style anything. In 2026 that habit costs you more than it used to: browsers,
reader modes, find-in-page, translation, and assistive tech all read the tag before they read
your class names, and a growing set of interactions — disclosure, dialogs, menus — now ship in
HTML with no JavaScript at all. This lesson is about using the element the platform already
built instead of rebuilding it in `App.tsx`.

## Landmarks and the accessibility tree

Every element you write is either mapped to an ARIA role or it isn't. `<header>`, `<nav>`,
`<main>`, `<aside>`, and `<footer>` map to `banner`, `navigation`, `main`, `complementary`, and
`contentinfo` — the landmarks a screen reader user jumps between with a single keystroke, and
the sections a reader-mode or "read aloud" feature uses to decide what's content versus chrome.
A `<div className="header">` maps to nothing. It looks identical on screen and is invisible to
every tool that isn't a human looking at pixels. (The Accessibility track, lessons 55–61, goes
deep on the accessibility tree and ARIA; this lesson only needs you to know that sectioning
elements populate it for free.)

`<section>` deserves more suspicion than the others: it only counts as a landmark region when it
has an accessible name (an `aria-label` or a heading it's labelled by). An unlabelled `<section>`
is just a styling hook, no better than a `<div>` — use `<section>` when the group has a heading
that could go in a table of contents, and reach for `<div>` otherwise.

## `<button>` vs `<a>` vs `<div onClick>`

The rule hasn't changed, but it's worth restating because div-soup keeps winning by default:

- **`<a href>`** — navigates, including to a new page, a hash, or a route your router intercepts.
  It's keyboard-focusable, shows up in "open in new tab", and gets crawled.
- **`<button>`** — does something in the current page: submits a form, toggles state, opens a
  dialog. Focusable, triggers on both click and <kbd>Enter</kbd>/<kbd>Space</kbd>, and has a
  `disabled` state the platform enforces (a disabled button truly ignores clicks; a disabled-
  looking `<div>` still fires `onClick` unless you remember to guard it).
- **`<div onClick>`** — the wrong answer in both cases. You've now signed up to reimplement
  focusability (`tabIndex={0}`), keyboard activation (`onKeyDown` for Enter *and* Space, which
  behave differently — Enter fires on keydown, Space fires on keyup and must preventDefault to
  stop the page from scrolling), the accessible role (`role="button"`), and the disabled state.
  React Compiler and hooks don't help here; this is markup debt, not a rendering problem.

If you catch yourself adding `role="button"` and an `onKeyDown` handler to a `<div>`, that's the
signal to use `<button>` instead and restyle it with `all: unset` if the default button chrome is
the problem.

## `<search>`, `<time>`, and `<output>`

Three small elements that replace one-off `<div>`s with something a machine can act on:

- **`<search>`** (Baseline since 2024) wraps a search form or filter UI the way `<nav>` wraps
  navigation — it's a landmark role of `search`, so "jump to search" works the same way "jump to
  navigation" does. Wrap the filter bar, not just the `<input type="search">` inside it.
- **`<time datetime="2026-09-17">`** gives a human-readable string ("last Thursday") a
  machine-readable value in the `datetime` attribute. Calendar apps, browser extensions, and
  translators can act on the value instead of guessing from prose.
- **`<output>`** names an element whose content is the *result* of a calculation the user
  triggered — a form total, a live validation summary. Screen readers announce it as a status
  region without you writing `aria-live` by hand, and it's the element the constraint-validation
  exercise in this lesson uses to show a result.

## Tables that are actually tables

A CSS grid of `<div>`s that *looks* like a spreadsheet gives a screen reader nothing to say about
row and column relationships. A `<table>` with `<thead>`, `<th scope="col">`, and `<tbody>` lets
assistive tech announce "Column: Amount, Row: Rent" as you navigate cells — behavior no amount of
`display: grid` recreates without reinventing ARIA's table role model by hand
(`role="table"`/`role="row"`/`role="cell"`, which few people get right). Reach for CSS Grid or
Flexbox for layout that only *resembles* tabular data (a card grid, a two-column form); reach for
`<table>` when the content has real row/column relationships someone might want to sort, scan a
column of, or have read aloud cell-by-cell.

## Disclosure without a single `useState`

`<details>` and `<summary>` are a complete, keyboard-accessible, animatable disclosure widget
built into HTML:

```html
<details>
  <summary>What's your refund policy?</summary>
  <p>Full refund within 30 days, no questions asked.</p>
</details>
```

Clicking (or pressing Enter/Space on) the `<summary>` toggles the `open` attribute on the parent
`<details>` — no click handler, no state, no ARIA to wire up (the browser exposes the correct
`group`/expanded semantics on its own). Give several `<details>` elements the same `name`
attribute and the browser makes them mutually exclusive, like a native accordion, again with zero
JavaScript:

```html
<details name="faq"><summary>Question one</summary>…</details>
<details name="faq"><summary>Question two</summary>…</details>
```

`name`-based exclusivity is a 2024+ addition — check current support before relying on it in
production, and note that some test environments (including this course's jsdom-based grader)
don't implement the exclusivity behavior yet even though real browsers do; you can still rely on
each `<details>` toggling its own `open` state correctly everywhere.

Need a section collapsed by default but still findable by <kbd>Ctrl/Cmd+F</kbd>? Use
`hidden="until-found"` instead of `hidden` on the element and a `beforematch` event if you need to
react to it being revealed — the browser expands it automatically when the in-page find matches
text inside, then leaves it open.

## `<dialog>`: modals without a portal library

`<dialog>` gives you the modal behavior teams used to pull in a whole library for: a top-layer
element above everything else (no z-index wars), a `::backdrop` pseudo-element you can style,
focus moved into the dialog and trapped there, focus restored to the trigger on close, and
Escape-to-close for free.

```tsx
const dialogRef = useRef<HTMLDialogElement>(null);

<button onClick={() => dialogRef.current?.showModal()}>Open</button>
<dialog ref={dialogRef} onClose={() => console.log('closed')}>
  <p>Are you sure?</p>
  <button onClick={() => dialogRef.current?.close('confirmed')}>Confirm</button>
</dialog>
```

`showModal()` (not just setting `open`) is what gives you the backdrop, the top layer, and the
focus trap — setting `open` directly, or calling `.show()`, opens it as a plain non-modal panel
with none of that. `close(returnValue)` records an optional string on `dialog.returnValue` and
fires a `close` event React exposes as `onClose`. The newer `closedby` attribute
(`"any"` | `"closerequest"` | `"none"`) controls whether a light-dismiss click outside the dialog
closes it, shipped in Chrome, Edge, and Firefox with Safari catching up through Interop 2026.

## The Popover API and invoker commands: the real JS-free replacement

`<dialog>` still needs a ref and an imperative call. The Popover API, Baseline widely available
since April 2025, removes even that for the huge share of UI that's a menu, tooltip, or
non-modal panel, not a true modal:

```html
<button popovertarget="menu">Open menu</button>
<div id="menu" popover>
  <a href="/profile">Profile</a>
  <a href="/settings">Settings</a>
</div>
```

`popover="auto"` (the default) light-dismisses on outside click or Escape and only one auto
popover can be open at a time; `popover="manual"` requires an explicit close and can stack. Pair
it with CSS anchor positioning (`anchor-name`/`position-anchor`) and `@starting-style` and you get
a positioned, animated menu with no JavaScript and no positioning library.

Invoker commands extend the same declarative pattern to arbitrary actions, not just show/hide:

```html
<button command="show-modal" commandfor="confirm-dialog">Delete</button>
<dialog id="confirm-dialog">…</dialog>
```

`commandfor` points at a target element's id; `command` names a built-in action
(`show-modal`, `close`, `toggle-popover`, `show-popover`, `hide-popover`, and others) or a custom
`--your-command` your own `command` event listener handles. This is the same shape as
`popovertarget`, generalized to buttons that open dialogs, close popovers, or trigger your own
logic — declarative wiring for interactions that used to require an `onClick` and a ref.

None of this is available in the sandbox's jsdom-based grader yet (no `showPopover`, no
`command`/`commandfor` reflection), so the exercises in this lesson stick to `<details>` and
`<dialog>`; treat the Popover API and invoker commands as "know it, reach for it in real
projects, expect quiz questions on it."

## Further reading (optional)

- [MDN: Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [web.dev: The Popover API is now Baseline Newly available](https://web.dev/blog/popover-baseline)
- [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [MDN: HTMLDialogElement `closedBy`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy)
- [MDN: `<search>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search)
