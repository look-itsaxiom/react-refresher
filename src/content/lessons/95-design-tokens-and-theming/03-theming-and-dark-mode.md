# Theming and dark mode in 2026

Dark mode is the theming problem everyone has shipped, so it's the clearest place to
compare mechanisms. There are four, and they're not interchangeable.

## Four mechanisms, one decision

1. **`prefers-color-scheme` media query.** Follows the OS automatically, zero
   JavaScript, but the user can't override it inside your app — there's no in-app "force
   dark" toggle without also touching the DOM.
2. **A class or attribute you set** (`.dark` on `<html>`, or `[data-theme="dark"]`).
   Needs JS to toggle, but gives you an explicit third state — light, dark, or "system" —
   and lets the user's in-app choice win over the OS setting.
3. **`light-dark()`**, a CSS function (Baseline-wide support since 2024) that picks
   between two values based on the computed `color-scheme` of the element: `background:
   light-dark(#fff, #171a21);`. It needs `color-scheme: light dark` set somewhere in the
   inheritance chain (usually `:root`), and then either the media query or your
   `.dark`/`[data-theme]` override can set `color-scheme` to pin the result. It collapses
   "two values, pick one" theming into a single declaration instead of two full rule
   blocks, but it only helps for values that are *just* a light/dark swap — a semantic
   token alias still needs a real custom property when three or more themes (brand
   variants, high contrast) are in play.
4. **`prefers-contrast` / `forced-colors`.** Not dark mode, but the same family: Windows
   High Contrast Mode (`forced-colors: active`) overrides your colors with a fixed
   user/OS palette and ignores most of your CSS color declarations entirely —
   `forced-color-adjust: none` opts an element back out where that would break a custom
   control. `prefers-contrast: more` is a softer signal you can use to bump text-to-background
   ratios without going that far.

`light-dark()` and a `.dark`/`[data-theme]` toggle aren't competitors — most 2026 setups
use both: the class/attribute picks the theme, `color-scheme` on that same element tells
`light-dark()` (and native form controls, and the scrollbar) which side to render.

## The three-state toggle, done right

"System / Light / Dark" is the expected UX, not "Light / Dark" — respect the OS default
until the user overrides it. That means three pieces of state to keep straight:

- **`preference`**: what the user chose — `'system' | 'light' | 'dark'`, persisted (a
  cookie if you need it server-readable for SSR, `localStorage` otherwise).
- **`resolved`**: what's actually painted — `'light' | 'dark'`, derived from `preference`
  (falling back to `matchMedia('(prefers-color-scheme: dark)')` when `preference` is
  `'system'`).
- A **`change` listener** on that `MediaQueryList`, active only while `preference` is
  `'system'`, so flipping the OS theme while the tab is open updates `resolved` without a
  reload.

This lesson's second exercise builds exactly this split — a `ThemeProvider` with injected
`storage` and `matchMedia` so it's testable without a real browser environment, keeping
`preference` and `resolved` as genuinely separate pieces of state rather than collapsing
them into one and losing the "system" option.

## No-flash: the part that has to run before React

If theme resolution happens inside your first React render, the page paints in the
default theme first and flashes to the real one a frame later — visible, and worse on
slow connections. The fix is a tiny inline `<script>` in `<head>`, before your bundle
loads, that reads storage, resolves the theme, and sets `data-theme` (or `color-scheme`)
on `<html>` synchronously:

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme-preference');
      var theme = stored === 'light' || stored === 'dark'
        ? stored
        : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    } catch (e) {}
  })();
</script>
```

React then hydrates into a DOM that's already correctly themed; your `ThemeProvider`
reads the same storage key on mount and agrees with what the script already set, so
there's no mismatch to reconcile. `<meta name="theme-color">` deserves the same
before-paint treatment if you're setting it dynamically — a mobile browser chrome that
flashes light-then-dark is the same bug one level up the page.

## Tailwind v4: `@theme`, `@theme inline`, and `@custom-variant`

Tailwind v4 moved theme configuration into CSS itself — no `tailwind.config.js` token
object. `@theme` declares CSS custom properties *and* tells Tailwind to generate
utilities from them in one step:

```css
@theme {
  --color-brand-500: oklch(62% 0.19 259);
}
```

generates `bg-brand-500`, `text-brand-500`, `border-brand-500`, and so on, for free. For
semantic, theme-dependent tokens, define the primitive once in `@theme`, then the
semantic name as a plain custom property redefined per theme — the pattern this project's
own `src/index.css` uses for `--color-surface`, `--color-ink`, and friends:

```css
@theme {
  --color-bg: #ffffff;      /* light default */
  --color-fg: #14171e;
}
:root[data-theme="dark"] {
  --color-bg: #0f1115;
  --color-fg: #e7e9ee;
}
```

`bg-bg` and `text-fg` are now themeable utilities. If a semantic variable needs to
*reference* another `@theme` variable rather than hold its own value, `@theme inline`
resolves that reference at build time instead of leaving a runtime `var()` chain —
useful when you want Tailwind's generated utility to bake in a fixed value rather than
stay dynamically swappable. And `@custom-variant` is what makes `dark:` work with your own
toggle instead of only the media query default:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

— which is close to what this project's `src/index.css` already does. `dark:bg-surface-2`
now activates from your `data-theme` attribute, not `prefers-color-scheme` directly. Need
to drop a whole namespace Tailwind ships by default (say, its default gray scale, because
your semantic tokens replace it)? `--color-*: initial;` inside `@theme` clears it before
you redefine your own. Outside of Tailwind's utility classes — inline styles, a canvas
`fillStyle`, a third-party widget — every one of these tokens is still a plain CSS custom
property, readable as `var(--color-bg)` anywhere.

## Color math for derived states

OKLCH is worth using for token *authoring* (not necessarily output — plenty of pipelines
still emit hex or `rgb()` for older-browser compatibility) because it's perceptually
uniform: lightening or darkening a color by adjusting its `L` channel doesn't also shift
its perceived hue the way HSL often does. `color-mix()` derives states — a hover color,
a disabled color — from a base token without hand-authoring a second token: `background:
color-mix(in oklch, var(--color-brand-500) 85%, black);` for a pressed state. Contrast
checking is still commonly done against WCAG 2's relative-luminance ratio (4.5:1 body
text) since that's what tooling and audits check today; APCA is the proposed WCAG 3
successor and worth knowing the name of, but treat it as not yet the thing you're graded
against.

## Multi-brand and reduced motion

Runtime per-tenant theming — a white-label product where tenant A and tenant B see
different brand colors from the same JS bundle — is the same custom-property override
mechanism at a different scope: set the overrides in a `<style>` block or inline
`style` on a wrapper, keyed by tenant, instead of `[data-theme]`. Watch Content Security
Policy here: injecting a `<style>` tag with tenant-supplied *values* is fine; injecting
tenant-supplied *CSS text* is a place `style-src` (or nonce-based inline style rules)
needs to allow it deliberately, not by accident. `prefers-reduced-motion` deserves its own
tokens too — `--motion-duration-base` swapped to near-zero under that media query — so
"disable motion" is one variable change, not a search-and-replace through every
`transition` declaration.

## Interview angle

A product where a customer and their vendors share the same dashboard is a natural candidate for per-tenant branding on top of light/dark, and this lesson's multi-brand section is the direct answer: the same custom-property override mechanism that powers a `.dark`/`[data-theme]` toggle also supports a tenant-scoped override, just at a different scope, a wrapper's `style` or a `<style>` block keyed by tenant instead of the document root. A strong answer keeps the three-state model straight (preference, resolved, and a media-query listener for "system") and can explain why the no-flash inline script matters more here than in a typical app: if a customer's branded theme resolves after first paint, they see your default brand flash before their own, which reads as a bug in a product they're being asked to trust with cross-company data.

**Likely follow-up:** You need to support a customer's brand color on top of light/dark mode. Where do the tenant override and the light/dark toggle interact, and where do they stay independent?

**Pitfall:** Treating "dark mode" and "multi-tenant branding" as the same problem solved by the same toggle, instead of recognizing they're two independent axes of the same custom-property mechanism. Collapsing them tends to produce a theme system where a customer's brand color silently resets when they switch to dark mode, because the two overrides were never designed to compose.

## Further reading (optional)
- MDN, `light-dark()` — https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- MDN, `color-scheme` — https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
- web.dev, dark mode — https://web.dev/articles/prefers-color-scheme
- Tailwind CSS v4, theme variables and `@custom-variant` — https://tailwindcss.com/docs/theme
