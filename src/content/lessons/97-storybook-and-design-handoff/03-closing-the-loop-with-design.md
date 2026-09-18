# Closing the loop with design

Lesson 95 built the token pipeline: Figma variables exported into a format code can consume,
turned into CSS custom properties or a Tailwind theme. This lesson closes the other loop —
keeping components and design files in sync after that first export, and catching it fast when
they drift apart, which they will, because two artifacts maintained by two different tools by two
different people never stay identical for long without a mechanism forcing it.

## Figma variables and modes, again

Figma variables (lesson 95) aren't just colors — a variable can hold a number, a string, or a
boolean, and a component's variant properties (the ones a designer swaps in the properties panel)
are the design-file equivalent of a component's props. A button's `variant` property with values
`primary`/`secondary`/`danger` in Figma should have a corresponding `variant` prop with the same
options in code; a `disabled` boolean property should map to a `disabled` prop. Modes (light/dark,
or brand-specific themes) are the multi-value axis on top: the same variable, `color-brand`,
resolves differently per mode, the same way a CSS custom property resolves differently under a
`data-theme` selector. Handoff drift shows up at both levels: a token whose *value* diverged
between the Figma mode and the shipped CSS, and a component whose *shape* (props/variants)
diverged from what the Figma component now allows.

## Code Connect and Dev Mode

Figma's Dev Mode is where an engineer inspects a design file for implementation — spacing,
colors, exported assets, measurements between elements. Code Connect (Figma's own tool,
configured via a browser UI or a CLI using TypeScript snippet templates) goes further: it maps a
Figma component directly to the real code component that implements it, so Dev Mode shows the
actual `<Button variant="primary">` snippet from your repository instead of Figma's
auto-generated (and often wrong) guess at markup. This is the direction "design to code" that
matters most for a design system — not generating a one-off component from a screenshot, but
making sure the canonical mapping between a Figma component and its code counterpart is explicit
and machine-checkable rather than tribal knowledge. The complementary direction — showing a Figma
frame *inside* Storybook next to a story — is `@storybook/addon-designs`, configured per story via
`parameters.design`; a design-system Storybook wires both directions so either party can jump to
the other's artifact from wherever they're already looking.

## Visual review: Chromatic, TurboSnap, and the DIY route

An interaction test (a `play` function) asserts behavior — the right thing happened after a
click — but says nothing about whether a border-radius token silently reverted or a shadow got
heavier. Visual regression tooling renders every story and diffs pixels against an accepted
baseline. Chromatic (built by the Storybook team, and the most common pairing) snapshots every
story on every push, and TurboSnap — its cost optimization — traces the builder's dependency graph
against the current commit's git diff so only stories whose actual dependencies changed get
re-captured; everything else is copied forward from the last accepted baseline at a fraction of
the cost. The workflow is: a PR triggers new snapshots, a human reviews the diffs, approves the
real changes and rejects (or investigates) the unexpected ones, and approval becomes the new
baseline. Without Chromatic, `@playwright/test`'s `toHaveScreenshot()` against Storybook's own
built stories is the DIY equivalent — you maintain the baseline images and the CI wiring yourself.
Either way, noisy diffs kill the practice: a live timestamp, a running CSS transition, or an
unpinned web font will fail nearly every snapshot for reasons that have nothing to do with the
code change, and a team that starts reflexively clicking "approve" has a visual regression suite
that no longer regresses on anything.

## Catching design drift on purpose

"Design drift" is the general failure mode underneath all of this: the design file and the
codebase disagree about what a component is. It shows up as a Figma variant property with no
code prop behind it (a designer added a `size="xl"` option nobody implemented), a code prop with
no Figma counterpart (an internal `data-testid` prop, which is fine, or a real variant a designer
doesn't know exists, which isn't), option lists that no longer match (`"primary"` in code vs.
`"Primary"` in Figma — often harmless case drift, sometimes a real mismatch), and token values
that diverged (a hex value hand-edited in code after a design review changed it in Figma but
nobody re-exported). None of this is exotic to detect once you frame it as two structured
documents that should agree — which is exactly what the second exercise below does, on
Figma-variables-shaped JSON and a code-side component/token manifest, the same comparison a real
`figma-api` script or a Code Connect lint step performs against your actual files.

## Figma MCP and AI design-to-code: what it's for and isn't

Figma's MCP server (introduced 2025, still evolving through 2026) lets an agent read a selected
frame's structure, styles, and variables directly and generate code from it — useful for scaffolding
layout quickly, and increasingly used to bootstrap a first draft of a screen. Treat its output the
way you'd treat any AI-generated first draft: it's very good at reproducing what's on the canvas,
and it has no way to know your design system already has a `Card` component that this layout
should be composed from instead of hand-rolled `div`s and inline styles. The caveat that matters
for a design system specifically: generated code optimizes for looking like the mockup, not for
reusing the component library, so a review step that asks "does this decompose into the components
we already have" is still a human job, whether the first draft came from an AI tool or a junior
engineer copying pixels by eye.

## Documentation sites, governance, and definition of done

Storybook is a living, code-backed documentation site — it can't lie about a component's current
props because it's generated from that component. Tools like zeroheight or Supernova sit one layer
up: a curated documentation site that can combine Storybook embeds with brand guidelines, voice
and tone, and cross-platform (iOS/Android/web) guidance a single Storybook instance doesn't cover.
Neither replaces the other. Governance is the harder, non-technical half: a contribution model
(who can add a component, what review it needs), a versioning policy (semver on the library
package, a changelog per release), and a deprecation path (a `deprecated` tag, a docs banner, a
codemod) that gives consumers time to migrate instead of a breaking change landing with no notice.
A workable definition of done for a design-system component ties the whole lesson together: a
story for every reachable state, the a11y addon showing no violations, an accepted visual
baseline, a Code Connect link (or equivalent) to the Figma source, and a docs description — a
component missing any of those is documented but not actually *done*, which is the checklist the
second exercise implements directly.

## Further reading

- [Figma Code Connect](https://developers.figma.com/docs/code-connect/) — developers.figma.com
- [@storybook/addon-designs](https://storybook.js.org/addons/@storybook/addon-designs) — storybook.js.org
- [Chromatic: TurboSnap](https://www.chromatic.com/docs/turbosnap/) — chromatic.com
- [Figma: Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode) — help.figma.com
