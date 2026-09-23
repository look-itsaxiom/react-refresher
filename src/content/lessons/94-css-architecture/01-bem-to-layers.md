# From BEM to layers: what each generation fixed

CSS has one namespace. Every rule you ship competes with every other rule ever loaded on
the page, resolved by an algorithm that knows nothing about your components, your team
boundaries, or your build graph. Five problems fall out of that, and every methodology
below is an answer to one or more of them:

1. **Specificity wars.** `#sidebar .widget p` beats `.text-muted`. Overriding it means
   writing something even more specific, or reaching for `!important`. Specificity only
   climbs over a codebase's life; it never comes back down on its own.
2. **Global namespace collisions.** Two teams both write `.card`, and whichever stylesheet
   loaded last silently wins.
3. **Dead CSS.** Nothing tells you a selector no longer matches anything in the DOM.
   Stylesheets only grow; deleting a component's markup rarely deletes its CSS.
4. **Ordering dependence.** Which of two equal-specificity rules wins depends on which
   `<link>` or `<style>` tag was parsed last — an accident of build output, not intent.
5. **Source-order coupling.** To predict what a selector does, you have to know where it
   sits relative to every other rule of equal or higher specificity, forever. Moving a
   file can change what renders.

## The naming era: BEM, OOCSS, SMACSS

Before the platform gave us any of this, the fix was **discipline encoded in naming**.
**OOCSS** (2009) split "structure" from "skin" so a `.btn` and a `.btn--primary` could be
combined instead of inherited. **SMACSS** grouped rules into base/layout/module/state/
theme categories, which is the same idea as layers, just enforced by convention and file
order rather than the language. **BEM** (`.block__element--modifier`) attacked problem 2
directly: if every class name is already unique to its component, two teams can't collide,
and specificity stays flat because everything is a single class selector. BEM's real
contribution wasn't the double-underscore syntax, it was proving that **flat specificity
by convention** works — every selector `[0,1,0]`, so ordering is the only thing left to
fight about.

**ITCSS** (Inverted Triangle CSS, Harry Roberts) tackled problem 4 and 5 by fixing *source
order* to a triangle of increasing specificity and explicitness: settings → tools →
generic → elements → objects → components → utilities. Low-specificity, far-reaching rules
(resets, element defaults) load first; narrow, high-specificity overrides (utilities) load
last. The ordering is the architecture. The catch: ITCSS is enforced entirely by file
concatenation order. Reorder your bundler's imports and the triangle silently inverts.

**CUBE CSS** (Andy Bell, ~2020) is a lighter, more current take: Composition (layout
primitives like stacks and grids), Utility (single-purpose classes), Block (BEM-ish
components, used sparingly), Exception (state overrides via data attributes). It leans
harder on utilities and the cascade doing useful work, rather than fighting the cascade
with specificity discipline.

## Cascade layers make ITCSS a language feature

`@layer` (Baseline across major engines since 2022–2023; treat it as safe to rely on)
turns ITCSS's ordering into something the browser enforces, independent of specificity:

```css
@layer reset, base, tokens, components, utilities, overrides;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer components {
  .card { padding: 1rem; border-radius: 0.5rem; }
}

@layer utilities {
  .p-0 { padding: 0; }
}
```

The critical rule: **a later-declared layer beats an earlier one, regardless of
specificity** — `.p-0` in `utilities` beats `#sidebar .card` in `components` even though
the id selector is more specific. That's the ITCSS triangle, except now moving a `<style>`
tag or reordering imports can't break it; the `@layer` *statement* (which can appear before
any layer has content) fixes the order once, up front. Two more rules matter:

- **Unlayered CSS always beats layered CSS**, at any specificity. A layer is a way to say
  "prefer this less," not "prefer this more." This is why third-party CSS you can't touch
  is dangerous: it's usually unlayered, so it outranks everything in your layers unless you
  wrap it in a layer yourself (see the next lesson step).
- **`!important` inverts layer order.** An `!important` declaration in an *earlier* layer
  beats an `!important` in a later one. This is deliberate — it lets a `reset` layer's
  `!important` (rare, but sometimes needed for truly foundational resets) survive
  everything declared after it.

## Zero-specificity resets: `:where()` and the `:is()` gotcha

`:where()` matches exactly like its argument list but always contributes `[0,0,0]` to
specificity, even with an id inside: `:where(#header)` is as weak as a single class.
That makes it the standard way to write resets and base styles that are trivially
overridable: `:where(h1, h2, h3) { font-weight: 600; }` instead of bare `h1, h2, h3`. The
gotcha: `:is()` and `:not()` and `:has()` are *not* zero-specificity — they take the
specificity of their **most specific argument** (not the sum of all arguments), so
`:is(#a, .b)` is `[1,0,0]`, as specific as `#a` alone.

## `@scope`: proximity instead of naming

`@scope (.card) to (.content) { p { color: var(--muted); } }` scopes a rule to elements
inside `.card`, stopping at the first nested `.content` (a "donut" — anything past that
boundary is excluded, so a card-in-a-card's inner `.content` isn't restyled by the outer
rule). Support landed in Chrome and Safari in 2023–2024 and in Firefox later; verify
current support before depending on it for a production baseline, but treat it as the
platform-native answer to component proximity that BEM naming and CSS Modules both faked
with strings and hashes.

## Four ways to draw the scoping boundary

CSS Modules, utility-first frameworks, Shadow DOM, and zero-runtime CSS-in-JS all solve
problem 2 (the global namespace) but draw the line in different places:

| Approach | Scoping mechanism | Specificity control | Runtime cost | SSR/RSC friendly | Tooling |
|---|---|---|---|---|---|
| BEM + layers | Naming convention + `@layer` order | Manual (flat by convention) | None | Yes | Stylelint, a linter for naming |
| ITCSS / CUBE | File order (or `@layer`) | Triangle-shaped by design | None | Yes | Convention only |
| CSS Modules | Build-time class hashing | Per-file, still real specificity | None (build step) | Yes | Vite/webpack loader, typed via a plugin |
| Utility-first (Tailwind) | Single-purpose classes, no nesting | Flat `[0,1,0]` per utility | None (or JIT build) | Yes | Tailwind CLI/PostCSS, `@utility` |
| Zero-runtime CSS-in-JS (vanilla-extract, StyleX, Panda) | Build-time hashed classes | Flat, generated | None (extracted at build) | Yes | Compiler/bundler plugin |
| Runtime CSS-in-JS (styled-components era) | Injected `<style>` per mount | Flat but injected late | Real (render-time style computation) | Poor — breaks streaming SSR/RSC | Babel/SWC plugin, now largely legacy |
| Shadow DOM | Real DOM boundary | Irrelevant — outer rules can't cross in | Small (per host) | Needs declarative shadow DOM for SSR | None — platform native |
| `@scope` | Proximity in the light DOM | Selectors inside still have normal specificity | None | Yes | None — platform native |

None of these replace `@layer`; they compose with it. A component library shipped as CSS
Modules or vanilla-extract still benefits from being loaded into a named layer so your
app's overrides have a predictable place to sit above it.

## Further reading (optional)

- MDN, [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- MDN, [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)
- MDN, [Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity)
- Andy Bell, [CUBE CSS](https://cube.fyi/)
