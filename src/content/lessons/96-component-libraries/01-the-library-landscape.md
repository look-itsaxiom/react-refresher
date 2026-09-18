# The library landscape, and why headless won

You've shipped components with React 18 habits: reach for a styled kit (MUI, Chakra, Ant
Design, Bootstrap-for-React), or hand-roll a `<select>` replacement with a `div` and some
`onClick` handlers and hope nobody tabs into it. Neither instinct fits how teams build
component UIs in September 2026. The middle layer — headless, unstyled primitives that own
behavior and accessibility while you own markup and CSS — has become the default, and the
distribution model on top of it has shifted too.

## Three ways to get a component

**Styled kits** (MUI, Mantine, Chakra UI 3, Ant Design) ship a component *and* its look.
You install `<Button>`, it renders with the library's design language, and you theme it
through the library's API (a theme object, CSS variables, style props). Fast to start,
hard to make look like *your* product without fighting the theme layer — and you're stuck
on the library's release cadence for both behavior fixes and visual changes.

**Headless libraries** ship behavior, state, and ARIA wiring with zero visual opinion.
Radix Primitives, Base UI, React Aria Components, Ariakit, and Headless UI (Tailwind Labs)
are this category. You get `<Tabs.Root>`, `<Tabs.Trigger>` and correct keyboard handling,
focus management, and `aria-*` attributes; you supply every class name. This is what
lesson 61 called "buy the hard parts" — the same argument, generalized past one combobox
to an entire component set.

**Copy-paste distribution** is the newest twist, popularized by shadcn/ui. Instead of an
npm dependency, a CLI command (`npx shadcn add tabs`) copies the component's *source* into
your repo, built on top of a headless primitive. You own the code from the moment it lands
— no black-box internals, no waiting on a maintainer for a one-line fix. shadcn's own
docs call this "open code" as a deliberate rejection of npm-package componentry.

## The shadcn/ui pivot to Base UI

For years shadcn/ui generated components on top of Radix Primitives. In **July 2026**,
Base UI became the new default for `npx shadcn init`, after shadcn reported users picking
it over Radix roughly 2:1 in an opt-in survey; Radix remains fully supported for existing
projects, and that same month React Aria Components landed as a third option via
`npx shadcn add --base aria` ([shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)).
Base UI itself is built by the MUI team together with engineers who previously built Radix
and Floating UI — it shipped 1.0 in December 2025 as `@base-ui/react` and is now in the
1.8.x line, with 35+ unstyled accessible components. Radix Primitives sits at 1.1.x;
several of its original authors moved on to Base UI and WorkOS-affiliated work, so treat
"actively developed" claims about Radix's pace as unverified rather than assumed.

This matters less for which specific package you pick than for what it tells you: the
*pattern* — compound components, `asChild`/`render` slot merging, data-attribute state,
controlled/uncontrolled hooks — has outlived any one library's popularity. Radix
popularized it, Base UI and React Aria Components both implement it, and shadcn's
generated code is just that pattern with your class names glued on. Learn the pattern, not
the package.

## A rough comparison

| | Styled kits (MUI, Mantine, Chakra 3) | Headless (Radix, Base UI, RAC) | Copy-paste (shadcn/ui) |
|---|---|---|---|
| A11y maturity | Varies by component | High — APG patterns, often AT-tested | Inherits from its base primitive |
| Styling | Theme API, hard to fully override | Total control, you write every class | Total control, generated with Tailwind |
| SSR / RSC | Mixed; some need `'use client'` everywhere | Base UI and RAC ship RSC-aware boundaries | You control the boundary yourself |
| Bundle | One dependency, but large | Small, per-primitive, tree-shakeable | Zero runtime dependency on the CLI itself |
| Maintenance | Vendor's roadmap | Vendor's roadmap | Yours — you own the copied code |
| React Aria specific | — | Deepest AT testing (Adobe), i18n/RTL, date formatting built in | — |

## What "own your primitives" actually costs

The pitch for building your own — instead of Radix/Base UI/RAC — is control: no
dependency upgrade breaking your bundle, no fighting someone else's `asChild` edge case.
The cost is real and often underestimated: roving tabindex, typeahead, focus trapping,
dismiss-on-outside-click, portal positioning, and screen-reader announcement timing are
each individually small but collectively the reason headless libraries exist. A team that
writes its own `Tabs` will re-derive most of what this lesson's exercises walk through —
and then maintain it forever. The reasonable middle ground most teams land on: adopt a
headless library (or shadcn's copy of one) for anything with real keyboard/AT surface
(comboboxes, menus, dialogs, tabs), and hand-roll only the genuinely trivial pieces
(a styled `<Badge>`, a layout `<Stack>`).

## Evaluation checklist

When picking a component source for a real project, check:

- **A11y**: does it implement the relevant [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) pattern, and is that claim tested against real assistive tech (React Aria publishes AT test matrices; verify before trusting a README badge)?
- **Styling model**: theme API, CSS variables + data attributes, or raw class names — which fits your design system from lesson 94?
- **SSR/RSC**: does it need a blanket `'use client'`, or does it ship server-safe pieces?
- **Bundle**: per-component imports, or one monolithic package?
- **Ownership**: dependency you upgrade, or code you copied and now maintain?
- **i18n/RTL**: does it handle bidi text, date/number formatting, and locale-aware keyboard maps, or is that on you?

## Further reading

- [shadcn/ui: Base UI becomes the default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [Base UI](https://base-ui.com/react/overview/quick-start)
- [Radix Primitives](https://www.radix-ui.com/primitives)
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/index.html)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
