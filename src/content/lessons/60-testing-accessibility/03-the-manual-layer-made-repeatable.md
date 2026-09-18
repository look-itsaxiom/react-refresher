## The manual layer, made repeatable

The gap automated tooling leaves is exactly the part that requires a human (or a very good
simulation of one) to actually perceive the page: does this make sense, is this operable, is
this legible under the conditions a real person will hit. The trick to keeping that gap closed
without it turning into an ad hoc, "someone remembers to check before launch" ritual is turning
each manual pass into a short, repeatable script — something you can run in five minutes on any
component, the same way you'd run a test file.

### The keyboard-only pass

Unplug your mouse, or just don't touch it, and drive the component with `Tab`, `Shift+Tab`,
`Enter`, `Space`, and arrow keys. Four things to check every time:

- **Tab order matches visual order.** A grid laid out with CSS that reorders visually (flex
  `order`, CSS Grid placement) without reordering the DOM will tab in DOM order, which can now
  disagree with what you see — confusing for anyone tabbing through, not only screen reader
  users.
- **Focus is visible.** `outline: none` with nothing put in its place is the single most common
  keyboard-accessibility bug in production CSS. `:focus-visible` lets you restyle the indicator
  without removing it for keyboard users while suppressing it for mouse clicks — there's rarely a
  reason to reach for `outline: none` instead.
- **Nothing traps focus outside a modal.** Tab should never land you somewhere you can't get out
  of, and Tab from a modal's last focusable element should either stay inside the modal (a
  correct focus trap) or move on — never dump you invisibly behind it.
- **Everything a mouse can do, a keyboard can also do.** A `<div onClick>` with no `tabIndex`,
  no keyboard handler, and no role is invisible to this test in the most literal way: you
  physically cannot reach it by tabbing.

### Screen reader smoke tests

You don't need to become a daily NVDA user to catch the biggest problems — you need a five-minute
script you run on new or changed components. The three combinations worth knowing:

- **NVDA + Firefox or Chrome (Windows)** — free, the most commonly used screen reader/browser
  pair by a wide margin in usage surveys, and the one most worth testing against if you can only
  pick one.
- **VoiceOver + Safari (macOS)** — built in (`Cmd+F5`), no install, and the default pairing on
  Apple hardware; VoiceOver in other browsers is a much less common combination.
- **TalkBack (Android)** — built in, worth a pass for anything mobile-first.

The one concept that trips people up first: screen readers have a **browse mode** (arrow keys
move a virtual cursor through the page's structure — headings, landmarks, lists — independent of
where actual focus is) and a **focus mode** (keyboard input goes to a focused form control or
widget, like typing in a text box). A page that reads fine in browse mode but breaks the moment
you tab into a custom widget is a common shape of bug: browse mode reads static content by
walking the DOM, but a widget with the wrong ARIA role or a missing keyboard handler is only
exposed once you're actually interacting with it in focus mode.

A five-minute script that catches most regressions: turn on the screen reader, then (1) navigate
by heading (NVDA: `H`; VoiceOver: `Cmd+Ctrl+Right` inside the rotor's heading filter) and confirm
the outline matches the visual structure; (2) navigate by landmark and confirm `main`, `nav`, and
similar regions are announced and non-redundant; (3) tab into every interactive element the
component adds and confirm its role and name are announced and make sense read alone, out of
visual context; (4) if there's a live update (a toast, a validation error, a loading state),
confirm it's actually announced without you having to move focus to it.

### Conditions worth emulating even when you can't test every device

Chrome DevTools' Rendering tab lets you emulate `prefers-reduced-motion`, `prefers-contrast`,
and **forced-colors** (Windows High Contrast Mode strips your custom colors and backgrounds
entirely, which reliably breaks anything relying on a background color alone to convey state —
a selected tab with no border, only a fill color, disappears). Zooming a page to 400% and
checking that content reflows into a single column instead of requiring horizontal scrolling
(WCAG's Reflow criterion) takes thirty seconds and catches a real and common failure in
fixed-width layouts. The CSS Overview panel in DevTools will also flag low-contrast text and
non-`:focus-visible`-friendly outlines across an entire page in one pass, which is a fast way to
scope how much manual work a legacy page needs before you start.

### Automating the screen reader pass itself

The manual script above doesn't have to stay entirely manual forever. **Guidepup** drives real
screen readers (VoiceOver on macOS, NVDA on Windows) programmatically and can be wired into
Playwright, letting you assert on what a screen reader actually announces rather than only on
DOM structure — closer to true end-to-end coverage than axe's static analysis. It also ships a
lighter "virtual screen reader" that simulates announcement behavior without a real OS-level
screen reader, useful for fast CI runs. Treat this as an emerging layer to add selectively — to
your highest-traffic or highest-risk flows — rather than something to reach for on day one; it's
real automation of a genuinely hard-to-automate thing, but adoption and tooling maturity here
move faster than a course can pin down, so verify current capabilities against the project before
committing to it.

### Writing an acceptance checklist, and shipping regressions safely

For any component complex enough to have its own ARIA pattern (a combobox, a dialog, a tab
panel), write down the specific keyboard and screen-reader behavior it must have — "Escape
closes and returns focus to the trigger," "Arrow Down moves selection without submitting" — as a
short checklist next to the component, not buried in a design doc. That checklist is what a
reviewer runs the manual pass against, and what future you re-runs after a refactor. When an
accessibility fix has any risk of behavior change (a repaired focus trap, a corrected tab order),
ship it behind the same feature-flag-and-canary discipline you'd use for any behavior change —
accessibility regressions are regressions, and "it's an accessibility fix" is not, on its own,
proof that it's safe.

**Further reading**
- [WebAIM: screen reader user survey (browse vs. focus mode background)](https://webaim.org/projects/screenreadersurvey/)
- [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN: `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- [Guidepup](https://www.guidepup.dev/)
