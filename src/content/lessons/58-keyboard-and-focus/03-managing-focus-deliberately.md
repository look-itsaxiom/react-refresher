# Managing focus deliberately

Concept 1 was about not breaking focus by accident. This one is about moving it on purpose: opening a dialog, building a toolbar or menu, and keeping focus sane across renders that a screen reader or keyboard user can't see coming the way a sighted mouse user can.

## Modal dialogs: let `<dialog>` do the trap

`<dialog>` covered the element's basic HTML in lesson 27. The reason to reach for it here instead of a styled `<div>` is that `showModal()` gives you, for free, everything a hand-rolled modal has to reimplement:

```tsx
function ConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose}>
      <button autoFocus onClick={onClose}>Cancel</button>
      <button>Confirm</button>
    </dialog>
  );
}
```

- **The trap is native.** While a dialog is modal, the browser keeps Tab and Shift+Tab cycling inside it; the rest of the document becomes inert automatically (unfocusable, unclickable, out of the accessibility tree) for as long as the dialog is open — you don't add `inert` yourself for a native `<dialog>`.
- **Initial focus** goes to the first element with the `autofocus` attribute (React's `autoFocus` prop); if none is marked, it goes to the dialog's first focusable descendant, and if there isn't one, to the `<dialog>` element itself.
- **`Escape` is handled for you** — it fires a `cancel` event, then `close`, and closes the dialog without any keydown listener from you.
- **Focus is restored to whatever was focused before `showModal()` ran** when the dialog closes — the button that opened it, typically — again with no code from you.

That native trap and restoration are exactly why non-native "dialog-like" UI (a slide-in drawer, a command palette that isn't built on `<dialog>`) is more work: you're rebuilding all four bullets above by hand, which is exactly what the first exercise does.

## When you can't use `<dialog>`

Non-modal overlays — a drawer that should let you still interact with the trigger, an autocomplete listbox, a tooltip — don't want a real focus trap or an inert background, so `<dialog>`'s modal behavior is the wrong tool. But some of them (an in-page drawer that *should* trap focus, just without `showModal`'s top-layer semantics) need you to hand-build the same four behaviors:

1. On open, move focus to the first focusable element inside.
2. On Tab/Shift+Tab, keep focus cycling within the container — wrap from the last focusable element back to the first, and vice versa.
3. On Escape, close.
4. On close, return focus to whatever triggered the open — normally the ref of the button that opened it, not `document.body`.
5. If the rest of the page should be unreachable while it's open, mark it `aria-hidden="true"` and/or set the `inert` attribute yourself (React 19 accepts `inert` as a boolean prop directly: `<div inert={isOpen} />`).

The exercise after this concept builds exactly this.

## Roving `tabindex` vs `aria-activedescendant`

A toolbar, listbox, menu, tabs, or grid is a single logical "stop" in the page's Tab order, but arrow keys need to move among several items inside it. The APG documents two accepted techniques:

- **Roving `tabindex`.** Exactly one item in the group has `tabindex="0"`; every other item has `tabindex="-1"`. Arrow keys call `.focus()` on the next item *and* flip which one has `tabindex="0"`, so Tab always lands back on whichever item was last active, and leaving the group with Tab goes to the next thing on the page — not back into the group. This is the technique the roving-tabindex exercise builds, and it's the default choice: real DOM focus moves, so `:focus-visible` styling, screen reader focus events, and browser autoscroll-into-view all work without extra effort.
- **`aria-activedescendant`.** The *container* keeps real DOM focus the whole time; arrow keys just update `aria-activedescendant="<id-of-the-active-item>"` on the container, and you style that item as "active" yourself (`:focus` doesn't apply to it, because it never actually receives focus). This avoids constantly moving real focus, which matters for things like a combobox listbox with thousands of virtualized rows where re-focusing DOM nodes on every keystroke would be expensive — but it's more fragile: you're responsible for the active-item styling, for keeping the id valid as items mount/unmount, and some AT/browser combinations have historically had rougher support for it than for plain focus movement. Default to roving `tabindex`; reach for `aria-activedescendant` only when the item count or virtualization makes moving real focus impractical.

## The Popover API

Baseline "newly available" since January 2025 (per MDN), the `popover` attribute turns any element into a top-layer overlay with light-dismiss (click outside or `Escape` closes it) and disclosure wiring built into HTML, no JavaScript required for the common case:

```html
<button popovertarget="menu">Options</button>
<div id="menu" popover>
  <button>Rename</button>
  <button>Delete</button>
</div>
```

`popovertargetaction="show" | "hide" | "toggle"` on the trigger controls what it does (default is `toggle`), and `:popover-open` lets you style the open state in CSS. It's the right default for menus, non-modal tooltips, and simple dropdowns — you get dismiss-on-outside-click and dismiss-on-Escape without hand-writing either. Related, newer pieces of this same platform push — a `closedby` attribute on `<dialog>`/`popover` for tuning light-dismiss behavior, and declarative "invoker commands" (`command`/`commandfor`) for wiring a button to open/close a popover or dialog without a `click` handler at all — are still rolling out across browsers; check current support before depending on them, and fall back to `popovertarget` plus a small amount of JavaScript in the meantime.

## Focus after the page changes without a page load

A traditional multi-page site resets focus to the document's top on every navigation, for free. A single-page app doesn't reload anything, so nothing does that for you: after a route change, leaving focus wherever it was (often a now-gone link) is disorienting for a keyboard or screen reader user in a way sighted mouse users won't notice, because they can just look at the new page. The common fix is to move focus to the new page's `<h1>` (or a dedicated, visually-hidden "route announcer" region) on navigation, and update `document.title` so the browser tab and screen reader both reflect where you are.

The same problem shows up for async content that appears without a navigation — a form submits and produces validation errors, a search resolves and adds results below the fold. Move focus to the first error, or to a heading introducing the new content, so a keyboard/screen-reader user's next Tab press starts from a location that makes sense; for updates that don't warrant stealing focus, use an ARIA live region to announce instead (lesson 57 covers those regions in depth).

## `flushSync` when you need to focus something React hasn't painted yet

React batches state updates, so code like this can silently fail to focus the newly-rendered input:

```tsx
function addRow() {
  setRows((rows) => [...rows, newRow()]);
  inputRefs.current[rows.length]?.focus(); // may run before the DOM node exists
}
```

`setRows` schedules a re-render; it doesn't synchronously produce the DOM node for the new row before the next line runs. `flushSync` (from `react-dom`) forces that render to commit synchronously, so the ref is attached by the time you call `.focus()`:

```tsx
import { flushSync } from 'react-dom';

function addRow() {
  flushSync(() => {
    setRows((rows) => [...rows, newRow()]);
  });
  inputRefs.current[rows.length]?.focus(); // DOM node now exists
}
```

Reach for this specifically for "render, then immediately focus what just rendered" — it opts out of batching for that update, so use it narrowly rather than wrapping everything in it.

## Portals move DOM position, not React position

`createPortal` renders a subtree into a different DOM node — typically appending a dialog or tooltip to `document.body` — while it stays in its original position in the React tree for props, context, and event bubbling. Tab order follows *DOM* position, so a portaled dialog's place in the tab sequence is wherever it landed in `document.body`, not wherever its parent component sits in your JSX. This is usually what you want for a modal (it should trap focus regardless of where it's declared), but it's worth knowing when debugging "why does Tab jump somewhere unexpected" — check where the node actually is in the DOM, not where it's written in the source.

## Use a library before rolling your own, in production

Everything above is mechanical enough to get subtly wrong: off-by-one wrap logic, forgetting Shift+Tab, restoring focus to the wrong element after an async close, an `aria-activedescendant` id that goes stale. Base UI, Radix, and React Aria all implement dialog focus trapping, roving tabindex, and popover/menu dismiss behavior correctly and have been exercised against real screen readers across browsers. Build the mechanics yourself to learn them — that's what both exercises in this lesson do — but reach for one of those libraries for anything shipping to real users.

## Further reading (optional)

- [MDN: The Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [MDN: `<dialog>`: The Dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [WAI-ARIA Authoring Practices Guide: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WAI-ARIA Authoring Practices Guide: Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)
- [React docs: `flushSync`](https://react.dev/reference/react-dom/flushSync)
