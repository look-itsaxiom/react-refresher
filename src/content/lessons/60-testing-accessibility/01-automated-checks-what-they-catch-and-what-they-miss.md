## Automated checks: what they catch and what they miss

You already write role-based queries with Testing Library — `getByRole`, `getByLabelText`,
`getByLabelText`'s cousins. That habit is, itself, an accessibility test: a query that fails
because there's no accessible `button` role or no label association is telling you the same
thing a screen reader user would discover. This lesson is about the layer on top of that habit:
tools that scan a rendered page against a rule set, and the manual passes that catch what no
rule set can.

### How axe actually works

`axe-core` (from Deque) is the engine behind `axe DevTools`, the Storybook a11y addon, Lighthouse's
accessibility category (as of recent versions), and most "accessibility linter" integrations you'll
meet. It doesn't read your JSX. It walks the **rendered accessibility tree** — the same tree a
screen reader consumes — computes styles (contrast, `display`, `visibility`), and runs a set of
rules against nodes: does this image have alternative text, does this button have a computed
accessible name, is this ARIA attribute valid for this role, is this `<div>` with `tabindex="0"`
missing a role. Because it operates on the computed tree rather than source, it's honest about
what actually reaches assistive tech — a `<button>` hidden by `display: none` inside a closed
accordion isn't flagged, because it isn't reachable right now.

Wiring it into what you already do:

- **Unit/component tests**: `vitest-axe` (a Vitest port of the long-standing `jest-axe`) adds a
  `toHaveNoViolations()` matcher. You render with Testing Library, run `axe(container)`, and
  assert on the result — a normal test, in your normal suite, not a separate pipeline.
- **Storybook**: the official a11y addon runs axe against every story and surfaces violations in
  the Storybook UI, which turns your component catalog into a live accessibility dashboard for
  free — you already built the stories for visual review.
- **Playwright / CI**: `@axe-core/playwright` gives you `AxeBuilder`, which runs axe against a
  real rendered page in a real browser (so real CSS, real focus behavior, real computed styles —
  things jsdom approximates). This is where you catch issues that only exist on the full page:
  landmark structure, tab order interacting with sticky headers, contrast against a background
  image.
- **One-off audits**: Lighthouse's accessibility audit and the WAVE browser extension are the
  same idea for a page you don't own the source of — running one against a competitor's site or
  your own production build is a fast way to spot obvious rot.

```ts
// component test, vitest-axe
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { expect, test } from 'vitest';
import { ProfileCard } from './ProfileCard';

test('has no automatically detectable a11y violations', async () => {
  const { container } = render(<ProfileCard name="Jordan Lee" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### The honest coverage number

Deque, the company that maintains `axe-core`, ran its own study scanning real production
pages with both automated tooling and manual expert review, and reported that automated testing
caught **57%** of the WCAG issues manual testers found — a figure the accessibility community
treats as an upper bound rather than a floor, since other estimates for general-purpose automated
scanning land lower, often cited in the 30–40% range depending on the rule set and the site.
Take the exact percentage with a grain of salt (it depends on what the study counted as an
"issue" and how rich the rule set was), but the shape of the finding is not in dispute and
matches what every team that's shipped both a clean axe run and a broken screen reader
experience already knows: **automated tools are excellent at structural presence and absence —
does this exist, is this attribute valid, is this ratio above a number — and blind to meaning**.
Axe can confirm an image has an `alt` attribute; it cannot tell you `alt="image1.jpg"` is
useless, or that `alt="decorative sparkle divider"` on a genuinely decorative icon should have
been `alt=""` instead. It can confirm a custom dropdown has `role="listbox"`; it cannot tell you
arrow keys don't move the selection.

That asymmetry is why role-based Testing Library queries pull real weight here, and why treating
them as a first line of accessibility testing (not just "a nicer way to find elements") is worth
being explicit about internally. A `getByRole('button', { name: 'Submit order' })` failing
because the accessible name changed, or because the element lost its role, is exactly the kind
of structural regression axe would also catch — except it's already running, on every PR, for
free, because you wrote it to test behavior in the first place.

### Treating violations as failing tests, not warnings

The version of this that actually holds a line in a real codebase: `axe` runs in CI and a
violation is a **failing test**, same severity as any other assertion. The version that quietly
rots: axe results logged as warnings that nobody reads. If you're introducing this into an
existing codebase with a backlog of known issues, an **allowlist keyed to a rule ID and a
selector** — "this violation, on this component, is known, ticketed, and will not regress
further" — lets you turn the gate on today without a multi-week fix-everything-first blocker,
while still catching every *new* violation immediately. Delete allowlist entries as you fix them;
an allowlist that only grows is a gate that's already off.

Two failure modes to watch for once this is running: **false positives**, where a rule fires on
something that's actually fine (a known one: `color-contrast` sometimes misjudges anti-aliased
text edges or text over a gradient) — investigate before suppressing, but don't be afraid to
suppress a genuinely wrong result with a comment explaining why; and **false negatives**, the
much bigger risk, where a clean axe run gets read as "this is accessible" instead of "this
cleared the ~half of issues a machine can see." The manual layer in the next section is how you
close that gap.

## Further reading (optional)
- [Deque: automated testing study identifies 57% of accessibility issues](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-issues/)
- [axe-core rule descriptions (dequelabs/axe-core)](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Playwright: accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [W3C WAI: evaluating web accessibility](https://www.w3.org/WAI/test-evaluate/)
