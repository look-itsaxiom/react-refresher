# An architecture for a React app in 2026

Lesson 28 covered the modern CSS *features*; lesson 18 covered the styling *tools*
(Tailwind 4, CSS Modules, vanilla-extract, StyleX, Panda). This step is about wiring those
together into something a team can maintain for years. The shape that holds up in 2026 for
a typical React app is a fixed layer stack plus a small number of explicit rules about
what goes where.

## The layer stack

```css
/* app.css — loaded once, at the top of the tree */
@layer reset, base, tokens, components, utilities, overrides;

@import "./reset.css" layer(reset);
@import "./base.css" layer(base);
@import "./tokens.css" layer(tokens);
/* Tailwind's own layers nest inside `components`/`utilities` below */
```

- **`reset`** — a minimal reset (box-sizing, margin removal, `img { max-width: 100% }`),
  written with `:where()` so it's trivially overridable by everything after it.
- **`base`** — element defaults for your design (`h1`–`h6`, `a`, `body` typography),
  also `:where()`-wrapped.
- **`tokens`** — `:root` custom properties. This is the shared vocabulary; see the next
  lesson on design tokens and theming for how these get generated and themed.
- **`components`** — hand-written component classes, whatever authoring tool produced
  them (BEM classes, CSS Modules output, vanilla-extract's generated classes).
- **`utilities`** — single-purpose classes, most often Tailwind's generated output.
- **`overrides`** — an escape hatch, empty by default, for the rare page-specific fix.

The ordering answers the question "who wins?" without anyone needing specificity tricks:
utilities beat components beat tokens beat base beat reset, always, regardless of how
specific any individual selector is. `!important` should not appear anywhere in this
stack except possibly inside `reset`, per the rule that `!important` inverts layer order.

## Where Tailwind 4 fits

Tailwind 4's own stylesheet declares `@layer theme, base, components, utilities;`
internally. When you `@import "tailwindcss"` into one of your named layers (Tailwind
supports importing into a specific outer layer), its internal layers nest inside yours, so
`components` and `utilities` in your stack should be the ones that hold Tailwind's output —
don't invent a second `utilities` layer for it. Tailwind's `@theme` block generates the CSS
custom properties that back its utilities (covered in the tokens lesson); its `@utility`
directive is the v4-native way to add a custom utility class that participates in variant
stacking (`hover:`, `md:`, etc.) — prefer it over hand-written utility classes for anything
that needs to compose with Tailwind's variants. `@apply` still exists but is explicitly
discouraged for new code in v4's own guidance beyond trivial cases: it re-introduces
specificity and ordering coupling inside what's supposed to be a flat utility layer, and it
usually signals "this should be a React component," not a CSS abstraction. Prefer
extracting a `<Button>` component over `.btn { @apply px-4 py-2 rounded; }`.

## When to reach for CSS Modules instead of utilities

Utilities run out of leverage for state-heavy, deeply conditional styling — a component
with a dozen interacting boolean props is more readable as a `.module.css` file with a
handful of classes toggled by a `cx()`/`clsx()` call than as a wall of conditional
Tailwind strings. The rule of thumb: **utilities for layout and one-off visual tweaks,
CSS Modules (or a component-variant helper, exercise below) for a component with real
internal state**. CSS Modules' `composes` lets one local class inherit another's
declarations at build time (no runtime cost, unlike Sass `@extend`'s selector duplication
problems), and `:global(.foo)` opts a single selector out of hashing when you need to
target something outside the module's control (a third-party widget's root class, for
instance). Type safety for module class names comes from Vite's built-in
`css.modules` config or a plugin like `typescript-plugin-css-modules` that generates
`.d.ts` files so `styles.doesNotExist` is a compile error, not a silent `undefined`
className.

## Third-party overrides: a layer, not a specificity fight

Third-party CSS (a date picker's default styles, a payment widget's iframe fallback) is
almost always **unlayered**, and unlayered beats every layer regardless of specificity.
Wrap it on the way in instead of fighting it after the fact:

```css
@import "some-widget/dist/styles.css" layer(vendor);
```

Insert `vendor` into your `@layer` statement wherever you want it to lose ties — usually
right after `reset`, so your `components`/`utilities` layers can override it without
`!important`. If you can't control the `<link>` tag (a CDN script injects its own
stylesheet), you generally can't retroactively move it into a layer; that's the one case
where a scoped `!important` in your `overrides` layer is a legitimate, documented escape
hatch rather than a habit.

## File organization and naming

Co-locate component-scoped CSS (a `.module.css` next to its `.tsx`, or component-variant
config inline) with the component. Keep the layer-level files (`reset.css`, `base.css`,
`tokens.css`) in a shared `styles/` directory — they're not "owned" by any one component,
so co-location doesn't apply. Naming: utility classes should read as *properties*
(`p-4`, `text-sm`, `flex`) because they're meant to be combined; component classes should
read as *nouns* (`.card`, `.card__header` or a Modules-hashed equivalent) because they're
meant to be looked up. Mixing the two conventions in one class list is the most common
readability failure in utility-first codebases — `<div className="card p-4 flex-col">` is
fine; `<div className="card cardHeaderIsActive p-4">` mixing three different naming
philosophies is not.

## Specificity budget, dead CSS, and linting

Adopt a one-line policy and enforce it with Stylelint (v16's flat config, built on
`stylelint-config-standard` plus an order plugin): every selector in `components` should be
a single class, optionally with `:where()`-wrapped state attributes
(`.card:where([data-active])`); ids and nested descendant selectors are lint errors outside
`reset`/`base`. `!important` is banned everywhere except `overrides`. For dead CSS,
utility-first architectures mostly solve the problem for free — Tailwind's on-demand
engine only emits classes it finds referenced in your source, so there's no "utilities.css
that grew for six years" to prune. Hand-written component CSS still rots; a coverage tool
(browser DevTools' CSS coverage tab, or a CI step that greps for class names with zero
`className`/`class=` matches in the repo) is the practical check, since automated dead-code
elimination for hand-written selectors remains unreliable.

## Migrating a legacy BEM/Sass codebase

You don't need to rewrite it. Wrap the entire legacy stylesheet in its own layer —
`@import "legacy.css" layer(legacy);` — positioned early in the `@layer` statement. New
code goes in `components`/`utilities` and, because those layers are declared later, it can
override legacy styles without touching a single legacy selector's specificity. Migrate
component-by-component by deleting the legacy rule for a component once its React
replacement ships, not by trying to convert the whole file at once.

## Further reading

- Tailwind Labs, [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
- Tailwind Labs, [Adding custom utilities (`@utility`)](https://tailwindcss.com/docs/adding-custom-styles)
- MDN, [`@layer` and import layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- Vite, [CSS Modules](https://vite.dev/guide/features.html#css-modules)
