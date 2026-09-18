# Stories as tests and documentation

Storybook 10 (released this year) made one breaking change that matters here: it's ESM-only, which
is why every config file and addon import in a current Storybook project uses `import`/`export`,
no CommonJS fallback. The build itself runs on the Vite builder (`@storybook/react-vite`) for a
React project — the old webpack builder still exists for legacy setups, but Vite is the default
path in 2026. None of that changes what a story *is*, only how fast the loop is: a story is still a
named export describing one rendered state of a component, and the point of writing one is that it
does three jobs at once — a visual catalog entry, a documented usage example, and (via `play`
functions and the Vitest addon) an executable test.

## Component Story Format 3

CSF3 pairs a default export (`meta`, describing the component and its shared defaults) with named
exports (each one a story):

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  args: { label: 'Click me', onClick: () => {} },
  argTypes: { variant: { control: 'select', options: ['primary', 'secondary'] } },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button');
    // interact and assert with Testing Library-style helpers
  },
};
```

`args` at the story level merge over `args` at the meta level — `Primary` above gets `label` and
`onClick` from `meta` plus its own `variant`. `argTypes` describes controls for Storybook's UI
(a select, a boolean toggle) and doesn't affect rendering. A `decorators` array — settable at the
global, meta, or story level — wraps the rendered story in extra markup or providers; when more
than one level defines decorators, they nest global-outermost, meta-next, story-innermost, so a
global theme provider always wraps a story-specific mock provider, never the other way around.
CSF Factories — a newer, more type-safe story format — reached preview status in Storybook 10 and
is slated to become the default in Storybook 11, but CSF3 above is still what you'll write and read
in most codebases through 2026.

## `play` functions turn a story into an interaction test

A `play` function runs after the story renders, given `canvasElement` (the story's root DOM node)
and the resolved `args`. Write it with the same query-by-role instinct as any other component test
— click a button, type into a field, assert the result is visible — and it does double duty: it
documents "here's this component mid-interaction" in the Storybook UI, and it fails CI when the
interaction breaks. `addon-vitest`, the current Storybook Test experience, runs every story (and
every `play` function) as an actual Vitest test, and is what most Vite-based projects use going
forward — the older, Playwright-driven `test-runner` package still works but is being superseded by
addon-vitest for exactly this stack.

## Reusing stories in Vitest: `composeStories`

The Vitest addon's real trick is `composeStories`, which takes a stories module (`{ default: meta,
Primary, Disabled }`) and returns ordinary components — "portable stories" — with `args`,
`decorators`, and `play` already resolved, so a story becomes a fixture your own Vitest tests can
render and interact with directly, no Storybook process required:

```ts
import { composeStories } from '@storybook/react-vite';
import * as stories from './Button.stories';

const { Primary, Disabled } = composeStories(stories);

test('disabled story is not clickable', async () => {
  render(<Disabled />);
  await Disabled.play({ canvasElement: /* ... */ });
  // assert
});
```

This is why "write the story once" is more than a slogan: the same object is the visual catalog
entry, the a11y-addon's audit target, and a Vitest fixture, instead of three hand-maintained copies
drifting out of sync.

## Autodocs, a11y, and MSW inside stories

`tags: ['autodocs']` on a meta generates a documentation page from the story's `args`, `argTypes`,
and any JSDoc on the component — usage docs that can't go stale from the code they're generated
from the way hand-written ones can. The accessibility addon runs an automated audit (axe-core)
against every story and surfaces violations right in the Storybook UI, which is the cheapest place
to catch a missing label or bad contrast ratio, before it reaches a PR. `msw-storybook-addon` wires
the same MSW handlers from [Mock the network, not the module] into Storybook's `parameters.msw`, so
a story for a data-fetching component can render with realistic mocked data instead of a hand-built
prop shape that doesn't match what the API actually returns.

## Visual regression: catching what a `play` function can't

An interaction test asserts behavior; it says nothing about whether a button quietly lost its
border radius. Visual regression tools (Chromatic and Argos are the two most common, both built
around diffing Storybook's own stories; Playwright's `toHaveScreenshot()` is the alternative for
projects without Storybook) render every story and diff pixels against a baseline, flagging
anything that changed for a human to approve or reject. They're inherently noisy unless you remove
the sources of nondeterminism first: disable CSS animations and transitions in the test
environment, use fixed/mocked data (a live "3 minutes ago" timestamp fails every diff), and
self-host or pin web fonts so a CDN hiccup doesn't repaint every story slightly differently. A
visual regression suite that isn't pinned this way trains a team to click "approve" without
looking, which defeats the entire point.

## Further reading

- [Storybook 10](https://storybook.js.org/blog/storybook-10/) — storybook.js.org
- [Writing stories: Decorators](https://storybook.js.org/docs/writing-stories/decorators) — storybook.js.org
- [Portable stories in Vitest](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest) — storybook.js.org
- [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index) — storybook.js.org
