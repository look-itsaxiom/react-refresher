# The cascade grew up

You already know specificity as inline styles beating IDs beating classes/attributes/pseudo-classes
beating types, with source order breaking ties. That model was fine when a page had one stylesheet.
It falls apart once you're composing a design system, a component library, and utility classes in
one build, because now "which rule wins" also depends on *where a rule came from*, not just how
it's written. CSS added a second axis for that: **cascade layers**.

## `@layer`: an explicit precedence axis

```css
@layer reset, base, components, utilities;

@layer reset {
  * { margin: 0; }
}
@layer components {
  .btn { padding: 0.5rem 1rem; }
}
@layer utilities {
  .p-0 { padding: 0; }
}
```

The `@layer reset, base, components, utilities;` statement declares layer order up front. Later
layers beat earlier layers **regardless of specificity** — a `*` selector in `utilities` beats a
`#id` selector in `reset`. Unlayered styles (plain rules with no `@layer` wrapper) beat *every*
layered rule, no matter how low-specificity they are. This is why Tailwind v4 wraps its own reset,
base, and utility output in layers: it lets your unlayered app CSS override a utility class without
a specificity fight, and it lets you reorder Tailwind's own internal precedence without touching
utility class names. Baseline since March 2022; treat it as safe everywhere in 2026.

Importance flips this. An `!important` declaration in the *first*-declared layer beats `!important`
in a later layer, and unlayered `!important` beats all layered `!important`. It's the mirror image
of the normal case. You'll rarely lean on this, but it's why "just add `!important`" doesn't always
do what you expect once layers are in play — check both axes.

## `@scope`: bounding a selector's reach

```css
@scope (.card) to (.card-media) {
  img { border-radius: 8px; }
}
```

`@scope` limits a selector to a subtree, and can exclude a nested subtree with `to (...)`. It solves
the problem nesting alone can't: "style descendants of `.card`, but don't leak into a `.card` nested
inside another `.card`." Cross-browser support landed with Firefox 128 in July 2024, so as of
September 2026 it's Baseline *newly available* but not yet *widely available* — reach for it in new
work, but don't rely on it for content that has to work in older enterprise browsers still in the
field.

## Native nesting

```css
.card {
  border: 1px solid var(--border);

  & > .title { font-weight: 600; }
  &:hover { border-color: var(--accent); }
  @media (width >= 40rem) { padding: 1.5rem; }
}
```

No preprocessor required. Nesting nested rules under `&` (or bare, in most cases) compiles to
exactly the selectors you'd expect, and it composes with `@media`/`@container` nested directly
inside a rule. Cross-engine support completed in December 2023 (Safari 17.2); Baseline calls this
*widely available* as of mid-2026. One gotcha carried over from Sass habits: a nested rule without
`&` is treated as a *descendant* selector, not a compound one — `.card { .title { } }` means `.card
.title`, not `.card.title`.

## `:has()`, and zero-specificity selection

```css
.card:has(img) { grid-template-columns: 1fr 2fr; }
form:has(:invalid) .submit { opacity: 0.5; }
```

`:has()` is a *parent* selector — style an element based on what's inside it, something JS used to
be the only way to do. It completed cross-engine support in December 2023 (Firefox 121) and is
Baseline *widely available* now. `:has()`'s specificity is the specificity of its most specific
argument, same rule `:is()` and `:not()` use.

`:is()` and `:not()` also take the specificity of their most specific argument — `:is(#id, .class)`
counts as an ID selector. `:where()` is the exception: it *always* contributes zero specificity, no
matter what's inside it. That makes `:where()` the tool for writing a reset or a base style that a
consumer can override with a single class, with no specificity war:

```css
:where(h1, h2, h3) { margin-block: 0; }
```

## `@property`: typed, animatable custom properties

Plain custom properties (`--gap: 1rem`) are untyped strings to the cascade — they can't be
interpolated in a transition and don't have a defined initial value. `@property` fixes that:

```css
@property --progress {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}
```

Now `--progress` can be animated smoothly (a gradient stop driven by it, for instance) the way a
built-in property can. Cross-browser support completed with Firefox 128 in July 2024 — Baseline
*newly available*, not yet *widely available* in September 2026.

## Logical properties

`margin-inline-start`, `padding-block`, `inset-inline`, `border-block-end` — these track writing
direction instead of physical sides. In an app with any right-to-left locale, `margin-inline-start`
is correct where `margin-left` silently isn't. Support has been Baseline widely available for years;
there's no reason left to reach for the physical-side properties in new code except in a handful of
paint properties (like `box-shadow`) that don't have logical equivalents yet.

None of this replaces knowing specificity — it adds a layer (literally) on top: layer order beats
specificity, specificity still decides ties within a layer or within the unlayered bucket, and
source order breaks ties within that.

## Further reading (optional)
- [MDN: `@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [MDN: `:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [web.dev: Cascade layers](https://web.dev/articles/css-cascade-layers)
- [MDN: `@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property)
