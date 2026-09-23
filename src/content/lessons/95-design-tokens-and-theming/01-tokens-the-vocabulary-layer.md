# Tokens: the vocabulary layer

You already do design tokens. Every `--color-accent` in `src/index.css`, every Tailwind
`@theme` block you've written, is a token: a name that stands in for a value so the value
can change without touching every place that used it. What's new since your React 18 days
isn't the idea — it's that the pipeline from "designer picks a color" to "CSS variable in
production" is now standardized enough to generate, lint, and diff like any other build
artifact.

## Three tiers, not one flat list

Token systems that stay maintainable separate **what a value is** from **what it's for**:

- **Primitive (global) tokens** — raw values, no opinion about usage: `color.blue.500`,
  `space.4`, `font-size.lg`. These come straight from a Figma variable or a brand
  palette.
- **Semantic (alias) tokens** — a primitive given a job: `color.bg.surface`,
  `color.text.danger`, `space.card-padding`. A semantic token's `$value` is almost always
  a reference to a primitive, never a raw value — that's the rule you'll lint for in this
  lesson's exercise.
- **Component tokens** (sometimes a fourth tier) — scoped to one component:
  `button.bg.primary` aliasing `color.bg.brand`. Not every system needs this tier; add it
  when a component's tokens diverge from the semantic ones enough to need their own
  names.

The payoff of the middle tier is the one that matters for theming: dark mode doesn't
redefine every component, it redefines `color.bg.surface` from `{color.neutral.50}` to
`{color.neutral.900}`, and every component that used the semantic name updates for free.

## The DTCG format

The Design Tokens Community Group (DTCG), a W3C community group, has been standardizing a
JSON shape for tokens for several years; as of 2026 the spec is still formally a draft,
but its shape is what Figma variable export, Tokens Studio, and Style Dictionary v4+ all
converge on in practice, so it's worth learning even though "stable 1.0" hasn't shipped.
A token is an object with a `$value` and a `$type`:

```json
{
  "color": {
    "brand": {
      "500": { "$value": "#3b82f6", "$type": "color" }
    }
  },
  "semantic": {
    "color": {
      "bg": { "$value": "{color.brand.500}", "$type": "color", "$description": "Primary surface background" }
    }
  }
}
```

`{color.brand.500}` is an **alias** — a reference to another token's path, resolved at
build time. `$description` and `$extensions` (a free-form bag for tool-specific metadata,
like a Figma variable ID) round out the metadata a token can carry. Some types are
**composite**: `typography` bundles `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`,
and `letterSpacing` into one token so a heading style is one name instead of five;
`shadow` and `border` are composite the same way. A `dimension` value isn't just a number
— it's `{ "value": 4, "unit": "px" }`, because "4" alone is ambiguous between px and rem.

## The pipeline: tokens in, everything out

The DTCG file itself isn't consumed by anything at runtime. A build step — Style
Dictionary is the dominant one, now well past its v3 rewrite and stabilizing around a
v4/v5 API depending on which minor you're pinned to — reads the token tree and runs it
through **transforms** (name a token `--color-brand-500`, convert a `dimension` to `4px`,
resolve `oklch()` math) and **formats** (emit CSS custom properties, a TypeScript `const`
object, an iOS `.swift` enum, an Android XML resource). One source of truth, N platform
outputs. A typical pipeline looks like:

```
Figma variables → Tokens Studio (JSON export) → DTCG JSON in a tokens repo
  → Style Dictionary (transforms + formats) → CSS vars, TS constants, native platform files
```

This lesson's first exercise is a miniature of exactly that middle step: you'll flatten a
nested DTCG tree into `--prefix-color-brand-500`-style CSS custom properties, resolve
aliases, and emit a parallel TypeScript module — the two outputs a real pipeline produces
first, before native platforms even enter the picture.

## Naming: semantic over visual

`--color-blue-500` describes what a value *is*. `--color-bg-danger` describes what it's
*for*. Name primitives by what they are (you need to know it's blue to build a palette
around it) and name everything a component actually consumes by its job. A rename from
`--space-4` to `--space-5` never happens; a rename from `--color-bg-danger` to
`--color-bg-critical` happens once, in one alias, and every consumer is already correct.
Prefixing (`--tc-color-...` for a design system npm package, versus a bare
`--color-...` for an app-local `@theme` block) avoids collisions when a token package is
consumed alongside other CSS.

## CSS custom properties are the runtime

Everything above compiles down to custom properties because they're the one platform
primitive with the right behavior: they **inherit** through the DOM like `color` does, so
a `[data-theme="dark"]` class on `<html>` repaints every descendant without JavaScript
touching a single element; they support a **fallback**, `var(--card-bg, #fff)`, for a
token that might not be defined in a given scope; and as of Baseline-wide support,
`@property` lets you register a custom property with a real syntax (`<color>`,
`<length>`, `<number>`) so the browser can type-check it, give it an initial value, and —
unlike an untyped custom property — animate or transition it:

```css
@property --brand-hue {
  syntax: '<number>';
  inherits: true;
  initial-value: 220;
}
```

An untyped `var()` is just a string substitution; the browser can't interpolate between
two arbitrary strings during a transition, but it can interpolate between two `<number>`s
once `@property` says that's what this one holds.

## Shipping tokens as a package

A design system distributes tokens as their own versioned artifact — `@acme/tokens` —
independent of the component library that consumes them, exporting a CSS file (import for
the variables), a TS module (import for autocomplete and non-CSS consumers like React
Native or canvas rendering), and often the source JSON itself for other tools to build
from. Because consuming apps pin a version, token changes follow normal semver: adding a
token is minor, renaming or removing one is a breaking major with a documented migration,
and a `$deprecated` extension on the JSON can warn consumers before a token disappears.

## Further reading (optional)
- Design Tokens Community Group format spec — https://tr.designtokens.org/format/
- Style Dictionary docs — https://styledictionary.com/
- MDN, `@property` — https://developer.mozilla.org/en-US/docs/Web/CSS/@property
- Tailwind CSS v4 theme variables — https://tailwindcss.com/docs/theme
