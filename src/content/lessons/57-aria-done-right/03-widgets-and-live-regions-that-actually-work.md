# Widgets and live regions that actually work

## The disclosure pattern

The simplest ARIA widget you'll build is a **disclosure**: a button that shows or hides a chunk of content. The APG's requirement is two attributes on the button:

```tsx
<button aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
  Notifications
</button>
{open && <div id={panelId}>{/* panel content */}</div>}
```

`aria-expanded` is a **state** — flip it every render, not just once. `aria-controls` is a **property** pointing at the `id` of the thing the button reveals, so AT can tell a user "this button controls that region" even before they activate it. Skip `aria-controls` and the relationship is invisible; skip updating `aria-expanded` and a screen reader announces "collapsed" forever, no matter what's on screen.

Because you started from a real `<button>`, you get Enter/Space activation, focus styling, and a tab stop for free. That's the whole argument for rule 1 in one component: the same disclosure built from `<div role="button">` needs `tabIndex={0}`, a `keydown` handler for Enter and Space that calls `preventDefault()`, and manual `:focus-visible`-equivalent styling — three things a `<button>` never asks you to think about.

## Toggle buttons vs. switches vs. checkboxes

Three roles model "on/off," and mixing them up is a common review comment:

- **`aria-pressed`** on a `<button>` — a toggle button, like a bold/italic button in a toolbar. It stays a button semantically; "pressed" describes a momentary visual state, not a form value.
- **`role="switch"`** with `aria-checked` — an on/off setting with immediate effect, the ARIA equivalent of a physical light switch. Convention (and most screen readers) announce it as "on"/"off" rather than "checked"/"unchecked."
- **`role="checkbox"`** with `aria-checked` — part of a set of independent selections, typically inside a form, announced as "checked"/"not checked," and it supports a third `"mixed"` state that switches don't.

All three need a real, focusable host — build them from `<button>` (for `aria-pressed` and `role="switch"`) so Enter/Space activation is free; don't build a switch from `<input type="checkbox">` unless you genuinely want checkbox semantics.

## Menu button vs. navigation, and `aria-haspopup`

`aria-haspopup` tells AT that activating this control opens something else — a menu (`"menu"`), a dialog (`"dialog"`), a listbox, grid, or tree. It's a property, set once, independent of whether the popup is currently open (that's `aria-expanded`'s job — the two work together: `aria-haspopup="menu" aria-expanded={open}`).

The distinction from the last section still matters here: a button that opens a dropdown of *actions* ("Share," "Duplicate," "Delete") is a real menu button — `aria-haspopup="menu"`, and the popup gets `role="menu"` with `role="menuitem"` children, arrow-key navigation, and `Escape` to close. A button that opens a list of *pages* to go to is navigation, even if it visually looks identical — it should be a `<nav>` full of real `<a>` links, with no `menu` role in sight, so link behaviors (open in new tab, "copy link," middle-click) keep working.

## `aria-current` for "you are here"

For navigation specifically, `aria-current` marks the active item without hijacking its role: `aria-current="page"` on the nav link matching the current route, `aria-current="step"` in a multi-step wizard, or bare `aria-current="true"` when none of the specific values fit. It's a property that *does* change — update it on navigation — but it never removes the element's native link semantics the way swapping in a `menu` role would.

## Live regions: the part everyone gets wrong

A live region is any element where content changes without a page reload get announced automatically, without the user having to be focused on that element. The mechanism is `aria-live`, but two roles set it implicitly: **`role="status"`** (implicit `aria-live="polite"` — waits for the user's current speech to finish, ideal for save confirmations and background progress) and **`role="alert"`** (implicit `aria-live="assertive"` — interrupts immediately, reserved for errors and failures the user must act on right now).

The rule that trips people up: **the live region has to already exist in the DOM before its content changes.** Screen readers watch a region for mutations; if you conditionally render the *whole element* only once there's something to say (`{status && <div role="status">{status}</div>}`), you've created a brand-new node with initial text rather than mutated an existing one, and most AT never announces it. The fix is to always render the container, empty or not, and only change its text:

```tsx
// Wrong: the region doesn't exist until there's something to announce
{status && <div role="status">{status}</div>}

// Right: pre-rendered, empty by default, text updated in place
<div role="status">{status}</div>
```

`role="alert"` is the one documented exception — because it's meant to interrupt immediately, most AT *does* announce an `alert`-role element the instant it's inserted into the DOM, mount and all. That makes it reasonable to mount an error message fresh (`{error && <p role="alert">{error}</p>}`) in a way that would silently fail for `status`.

A few more rules that separate a live region that works from one that's just noise:

- **`aria-atomic="true"`** tells AT to re-announce the *entire* region on any change, not just the specific text node that mutated — use it when a region's parts are only meaningful together, like "3 of 12 items selected" where announcing just the "3" is useless.
- **`aria-relevant`** (default `"additions text"`) controls which kinds of mutation trigger an announcement — additions, removals, text changes, or all of them; you'll rarely need to touch it, but know it exists before you fight a live region that "isn't announcing" a removal.
- **Don't wire `aria-live` to every keystroke.** A live search-results count that updates on every character typed produces an announcement per keystroke, which talks over the user's own typing. Debounce it, or only announce once results settle.
- **One region per concern, reused.** Don't spin up a new `status` node per toast; keep one region and swap its text, or a fast sequence of updates can get coalesced or dropped by AT before the user hears any of them.

## Announcing route changes in an SPA

A traditional page load announces the new page's `<title>` automatically. A client-side route change doesn't trigger that browser behavior at all, so single-page apps need to announce navigation manually: update `document.title` on every route change (assistive tech and browser tab UI both depend on it), and pair it with a `role="status"` live region — rendered once near the app's root — whose text updates to the new page's heading after each navigation. React Router and Next.js don't automate this for you; app code has to fill the gap.

## Verifying your work

Two checks catch most of this without a screen reader: open Chrome DevTools' **Elements → Accessibility** pane and confirm the node you expect actually carries the role, name, and state you intended — a name of "" or a missing `expanded` state shows up immediately. Then turn on a real screen reader (VoiceOver on macOS with Cmd+F5, NVDA on Windows) and drive the exact widget with only the keyboard; if you can't tell what changed by sound alone, a screen reader user can't either. Lesson 60 covers automating both checks.

## Further reading (optional)

- [APG: Disclosure (Show/Hide) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [APG: Switch Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
- [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [MDN: aria-current](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current)
