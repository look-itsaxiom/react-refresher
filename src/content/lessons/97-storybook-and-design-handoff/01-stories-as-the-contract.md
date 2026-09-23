# Stories as the contract

Lesson 43 covered CSF3 mechanics — `meta`/`StoryObj`, args merging, decorator order, and
`composeStories` for portable stories. This lesson treats stories as something bigger: the
contract between a component and everyone who uses it, and the thing a design system's
Storybook instance is actually *for*. If a component library (lesson 96) is the product,
Storybook is where its API gets documented, tested, and reviewed — not an afterthought bolted
on once the component works.

## Every state is a story, args are the API surface

The discipline that makes a component library trustworthy is simple to state and easy to skip:
every state a consumer can hit in production gets a story. Not just `Primary` and `Disabled` —
the loading skeleton, the empty state, the error state, the truncated-text overflow case, the
RTL layout. A component with five boolean props and no story exercising `error && loading`
together is a component nobody has actually looked at in that state. `args` are the mechanism:
each story is a named, args-driven snapshot of a state, and because args are just data, the same
story that renders the state in the Storybook UI can drive a `play` function's interaction test
or seed a Chromatic snapshot. A prop that exists but appears in zero stories is a prop nobody is
testing, documenting, or design-reviewing — treat "no story covers this prop value" as a gap the
same way you'd treat untested code.

## Autodocs and argTypes inference

`tags: ['autodocs']` on a meta (or globally in `.storybook/preview.ts`) generates a documentation
page per component automatically: a title, the component's own JSDoc description, a controls
table, and a `Stories` block rendering every story with its args. The controls table's rows come
from `argTypes`, and Storybook infers most of them for you via `react-docgen` reading the
component's TypeScript props — a `boolean` prop becomes a toggle control, a string union becomes
a `select`, a plain `string` becomes free text — so a well-typed component gets a working docs
page with zero `argTypes` written by hand. You still write `argTypes` explicitly to override an
inferred control (a `string` that's really a `color`), to add descriptions markdown doesn't infer,
or to document a prop TypeScript can't see the shape of (an object bag). `parameters.docs.page`
lets you swap the generated template for MDX when a component needs prose alongside its table —
usage guidelines, a "don't do this" callout, migration notes from a deprecated variant.

## Parameters and decorators: themes, viewports, a11y

`parameters` is the other half of a story beyond `args` — configuration that doesn't change what
renders, but changes the environment it renders into. `parameters.backgrounds` sets the canvas
color per story or per meta; `parameters.viewport` previews a component at a phone or tablet
width without a physical device; `parameters.a11y` tunes or disables specific accessibility rules
for a story that intentionally violates one (a decorative icon with a `presentation` role, say).
Global-level `parameters` and `decorators` (set once in `.storybook/preview.ts`) are how a design
system wires up cross-cutting concerns for every story at once — a theme provider, a router
context, an i18n provider — without every component author remembering to add it. Remember from
lesson 43 that decorators nest outermost to innermost as global, then meta, then story, so a
global theme decorator always wraps a component's own story-specific decorator, never the
reverse.

## MDX guideline pages

Not everything worth documenting is a component. A design system needs prose pages too — color
palette usage rules, spacing scale rationale, a "when to use Button vs. Link" decision guide —
and Storybook renders these as MDX 3 documents alongside the generated component docs, addressable
in the same sidebar tree. MDX lets you embed live `<Canvas>` blocks pulling in real stories next
to the prose explaining them, so a guideline page never drifts from the components it describes
the way a static Figma frame or a wiki page can.

## `play` functions, the Vitest addon, and the a11y addon

A `play` function makes a story double as an interaction test — click through a multi-step flow,
assert the DOM after each step — and Storybook's Test experience (the Vitest addon, built on
`@storybook/addon-vitest`) runs every story, including its `play` function, as an actual Vitest
test in CI, not just in the interactive UI. `@storybook/addon-a11y` runs an automated axe-core
audit against every rendered story and can fail the same Vitest run on violations, which is the
cheapest place in the whole pipeline to catch a missing label or a contrast failure — before a
PR, before a design review, before a screen reader user finds it in production.

## Publishing and organizing the instance

A built Storybook is a static site (`storybook build`, output directory `storybook-static`) —
deploy it the same way you'd deploy any static build (lesson 89), and wire a per-PR preview
(Chromatic, Vercel, or a custom static-host step) so a reviewer can click through the actual
rendered components on a branch instead of reading a diff. For a design system specifically,
organize the sidebar deliberately: a `title` like `Design System/Forms/Button` groups by domain
first, not by folder structure, so `Forms` sits next to `Forms/Input` and `Forms/Select` even if
the files live in unrelated directories; reserve top-level categories for genuinely different
audiences (`Foundations`, `Components`, `Patterns`) rather than mirroring the repo's file tree.
Consistent `tags` (`autodocs`, `stable`, `deprecated`, `experimental`) let you filter the sidebar
and drive a status badge, which matters once a library has enough components that "is this one
safe to use" stops being obvious from the name alone.

## Further reading (optional)

- [Storybook: Autodocs](https://storybook.js.org/docs/writing-docs/autodocs) — storybook.js.org
- [Storybook: Parameters](https://storybook.js.org/docs/writing-stories/parameters) — storybook.js.org
- [Storybook Test / Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index) — storybook.js.org
- [@storybook/addon-a11y](https://storybook.js.org/addons/@storybook/addon-a11y) — storybook.js.org
