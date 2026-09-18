# Component styling patterns

Picking a styling engine is a one-time decision; the patterns below are what you actually
write day to day, and they're mostly engine-agnostic.

## Variants: `cva` and `tailwind-variants`

Once a component has more than one visual state (`intent`, `size`, disabled, selected),
string-concatenating class names by hand gets unreadable fast. `class-variance-authority`
(`cva`) and `tailwind-variants` both solve this with the same shape: declare a `base`
class string, a `variants` map keyed by prop, and optional `compoundVariants` for
combinations that need their own classes:

```ts
const button = cva('inline-flex items-center rounded-md font-medium', {
  variants: {
    intent: { primary: 'bg-accent text-white', danger: 'bg-danger text-white' },
    size: { sm: 'h-8 px-3 text-sm', lg: 'h-12 px-6 text-base' },
  },
  compoundVariants: [{ intent: 'danger', size: 'lg', class: 'ring-2 ring-red-300' }],
  defaultVariants: { intent: 'primary', size: 'sm' },
});
```

`button({ intent: 'danger', size: 'lg' })` returns one class string. The upcoming exercise
has you build the core of this yourself as a plain function — that's all a variant builder
is: a lookup table plus string concatenation, with one more piece, below.

## `clsx` and `tailwind-merge`: conditional and conflict-free classes

`clsx(...)` handles the "concatenate only the truthy ones" problem —
`clsx('btn', isActive && 'btn-active', className)` — and is usually what `cva` uses
internally. `tailwind-merge` solves a different problem: when two Tailwind classes target
the *same* CSS property, the one later in the string doesn't reliably win, because
Tailwind's cascade order depends on stylesheet order, not source order in your `className`
string. `twMerge('p-2', 'p-8')` resolves that deterministically to `'p-8'` by understanding
which utilities conflict. This matters most when a component accepts a `className` prop
for the caller to override defaults — without merge logic, `<Button className="p-8" />`
might not actually win over the component's own `p-2`.

## Design tokens as CSS variables

Whether the token is defined in Tailwind's `@theme`, a CSS Module's `:root`, or plain CSS,
the mechanism for theming without duplicating components is the same: define the token as
a custom property, and have components read `var(--token-name)` instead of a literal
value. Switching themes then means changing what the variable *resolves to*, not touching
component code. This project does it with `data-theme` on the document root (see
`src/index.css`): `:root[data-theme="light"] { --color-surface: #ffffff; }` overrides the
dark defaults declared in `@theme`. The exercise ahead has you apply this pattern to a
smaller, component-scoped case.

## Dark mode: `data-theme` vs `prefers-color-scheme`

`prefers-color-scheme` is a media query — the browser tells you the OS-level preference,
and you can't override it without also tracking your own state, because a media query
can't be "set" imperatively. An explicit `data-theme="dark"` attribute, toggled by your own
app state, gives users an in-app override, persists to `localStorage`, and is trivial to
test (as you'll see in the exercise, and as `@custom-variant dark` in this project's own
CSS relies on). Most production apps now do both: default the attribute from
`prefers-color-scheme` on load, then let the user's explicit toggle win from then on.

## Container queries and `:has()` replace JS layout hacks

Two CSS features that reached full, Baseline browser support are now doing work that used
to require `ResizeObserver` or class-toggling JavaScript:

- **Container queries** (`@container`) size a component off its *containing element*, not
  the viewport — the actual need for a "responsive card" that looks different in a sidebar
  than in a main column. Tailwind v4 ships `@container`/`@sm`/`@lg`-in-container variants
  as core utilities, no plugin required.
- **`:has()`** is a "parent selector": `.form:has(:invalid)` styles a form based on a
  descendant's state, and `label:has(+ input:focus)` reacts to a sibling's focus — patterns
  that needed a JS event listener and a class toggle before. As of 2026, `:has()` has
  effectively universal support across evergreen browsers.

Reach for these before writing a `ResizeObserver` or a focus-tracking `useState` — if the
condition is expressible as CSS, it will stay correct without a re-render.

## Scoping and shadcn/ui's copy-the-source model

CSS Modules and `vanilla-extract` scope by generating unique class names at build time.
Shadow DOM (web components) scopes by the browser enforcing a style boundary. shadcn/ui
takes a third approach entirely: it isn't a component *library* you `npm install` — its
CLI copies component source files into your repo, so you own and can edit the styling
directly, with no wrapper abstraction to fight. As of July 2026, `shadcn init` defaults new
projects to building those components on **Base UI** rather than Radix UI (Radix remains
fully supported and is not deprecated; `shadcn init -b radix` keeps the old default). The
styling layer — Tailwind classes baked into the copied source — is unaffected by that
underlying primitives swap; only the accessibility/behavior layer underneath changed.

## Further reading

- [class-variance-authority](https://cva.style/docs)
- [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- [CSS `:has()` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [shadcn/ui: Base UI as the Default (July 2026)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
