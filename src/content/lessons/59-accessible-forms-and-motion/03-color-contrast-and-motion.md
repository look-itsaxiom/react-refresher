# Color, contrast, and motion

Lesson 55 built the contrast-ratio math itself; this is about where that math actually gets
applied in a real UI, and about the sibling rules — non-text contrast, forced colors, and
motion — that a pure luminance calculator doesn't cover.

## Color alone is never the whole signal

WCAG 1.4.1, Use of Color, says color can't be the *only* way information is conveyed. A status
list where "queued" is gray, "running" is blue, "failed" is red, and "done" is green, distinguished
by dot color alone, fails this the moment someone can't distinguish red from green (roughly 1 in
12 men) or is using a grayscale display, a screen reader, or a monochrome print-out. The fix is
always the same shape: add a second channel. Text ("Failed"), an icon shape (a triangle, not just
a red circle), or a pattern — any of these, paired with color, and the color becomes reinforcement
rather than the sole carrier. The accessible name of the item matters too: a screen reader user
gets nothing from a colored dot with no text at all, so the item's accessible name needs to
include the status word, whether that's visible text or an `aria-label` alongside a purely
decorative icon.

## Contrast isn't just body text

1.4.3 (and its stricter AAA cousin 1.4.6) sets minimums for *text*: 4.5:1 normal, 3:1 large.
1.4.11, Non-text Contrast, extends the same idea to UI components — the pieces of a page that
aren't text but still carry meaning: icons, input borders, checkbox outlines, and focus
indicators, all need 3:1 against their immediate background in every state that matters
(including the unfocused/default state for things like input borders, and the focused state for
focus rings). A light gray 1px border at 1.2:1 against a white page is a common, easy-to-miss
failure — it "reads" as a boundary visually only because everyone already knows form fields have
borders.

Two contrast pitfalls that are specific to how teams actually build UI:

- **Dark mode isn't "invert the palette."** A palette tuned for light backgrounds, flipped
  mechanically, routinely produces pure-white text on pure-black backgrounds, which is
  technically high-contrast (21:1) but uncomfortable at length and can cause halation for some
  low-vision users. Most accessible dark themes use near-black (`#121212`-ish) backgrounds and
  off-white (not `#fff`) text, and — this is the part that's easy to skip — every contrast pair
  needs re-checking in dark mode specifically. A pair that passes in light mode can fail in dark
  mode with the "same" colors at different luminance.
- **Focus rings are non-text UI**, so 1.4.11 applies to them directly. `outline: none` without a
  replacement is the single most common accessibility regression in shipped CSS — it usually
  happens because a default browser outline didn't match the design, and the fix removed it
  instead of replacing it with a custom one that still meets 3:1 against both the element's
  background and the page background around it.

## Forced colors mode

Windows High Contrast mode — now standardized in CSS as **forced colors mode** — replaces a
page's author-specified colors with a small, user-chosen system palette, and it's not optional
opt-out territory for a huge number of low-vision users. Test for it with the `forced-colors: active`
media query. In forced colors mode, background images and most `box-shadow`s are stripped
entirely (they're treated as decoration, not structure), so a card that relies on a shadow for
its boundary becomes invisible — use a real `border` instead, since borders survive. `outline`
also survives, which is one more reason to build focus indicators from `outline` rather than
`box-shadow` alone.

Use the CSS4 system color keywords (`Canvas`, `CanvasText`, `LinkText`, `ButtonFace`,
`ButtonText`, `Highlight`, `HighlightText`, `Field`, `FieldText`, and others) for anything you
want to *participate* in forced colors mode rather than fight it — an icon drawn with
`fill: currentColor` inherits `color`, which the browser is already remapping to a system color,
so it stays legible without you writing a forced-colors-specific override. Reach for
`forced-color-adjust: none` only for the rare element (a brand logo, a color picker swatch) where
the actual color is the content and forcing it to a system color would make the UI meaningless —
it's an escape hatch, not a default.

## Motion: reduce it, don't just remove it

`prefers-reduced-motion: reduce` reports a user preference, set at the OS level, for less
non-essential motion — vestibular disorders, migraines triggered by parallax and large
transitions, and plain distraction are all real reasons someone sets this. The instruction is
"reduce," not "eliminate": a large sliding panel becomes a fade or a simple instant appearance,
not necessarily *zero* transition. A subtle opacity fade under ~5px of movement is usually fine
even under `reduce`; a full-viewport parallax slide is exactly what the query exists to stop.

```css
@media (prefers-reduced-motion: reduce) {
  .banner {
    animation: none;
    transition-duration: 0.01ms;
  }
}
```

The safer default in component code is to *branch on the query* rather than write one animation
and hope the media query overrides it: gate the animated variant behind
`window.matchMedia('(prefers-reduced-motion: reduce)').matches`, so the reduced path is a
deliberate, testable code path — a `data-motion="reduced"` attribute your styles (and your tests)
can key off — rather than trusting that every CSS rule downstream remembers to check the media
query too. `prefers-contrast` (`more`, `less`, `custom`, `no-preference`) is the same idea for
contrast preference and has far less content behind it today; treat it as an escape hatch for a
theme with unusually low base contrast, not a load-bearing part of your design system yet.

Two WCAG criteria bound this from the other direction, independent of any media query:

- **2.2.2, Pause, Stop, Hide** — any content that moves, blinks, or auto-updates for more than
  five seconds (a carousel, an auto-advancing set of tips, a ticking counter) needs a visible way
  to pause, stop, or hide it. This applies even to a user with *no* stated motion preference.
- **2.3.3, Animation from Interactions** (AAA, but worth building toward) — motion triggered by
  user interaction, not just autoplay, should also be disable-able. A parallax effect that
  triggers on scroll is exactly the case `prefers-reduced-motion` is built for, and it counts as
  "from interaction," not "autoplay."

View Transitions and any spring/physics-based animation library sit on top of the same rule: the
transition itself should be skippable or shortened when `matchMedia('(prefers-reduced-motion:
reduce)').matches` is true, which most transition APIs support directly (the View Transitions API
checks the media query itself for its default cross-fade; custom `::view-transition` CSS you add
on top does not get that for free and needs its own guard).

## Testing this without a specific OS

You don't need a screen reader lab to check most of this. Chrome and Edge DevTools → **Rendering**
tab → **Emulate CSS media feature `prefers-reduced-motion`** and **Emulate CSS media feature
`forced-colors`** flip both without touching OS settings, and Firefox's equivalent lives under the
same panel. The actual OS toggles matter for a final check (Windows Settings → Accessibility →
Visual effects → Animation effects; Windows Settings → Accessibility → Contrast themes for forced
colors; macOS System Settings → Accessibility → Display → Reduce Motion), but DevTools emulation
is what you reach for while iterating, and it's exactly what this lesson's exercise checks
simulate by injecting a `matchMedia` stub instead of touching real OS state.

### Further reading (optional)

- [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN: `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- [web.dev: prefers-reduced-motion](https://web.dev/prefers-reduced-motion/)
- [WCAG 2.2: Non-text Contrast (1.4.11)](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
