# What e2e is for, and Playwright's model

End-to-end tests are the most expensive layer in the testing strategy this course covers earlier
("A strategy, not a pyramid argument"): slowest to run, slowest to diagnose when red, and the only
layer that can fail because of a flaky third-party script instead of your code. That expense buys one thing nothing else can: proof that a real browser, running your
actual built app, can complete a flow across pages and (optionally) a real backend. Spend that
budget on the handful of flows you'd get paged for — sign-up, checkout, the auth redirect, a
cross-service handoff — not on every button in the app. Playwright (currently 1.63, released
September 5, 2026) is the dominant tool here, alongside Cypress and WebdriverIO, because its model
matches how browsers actually behave instead of forcing tests to fight the DOM.

## Browsers, contexts, pages

A Playwright `Browser` is one installed engine (Chromium, Firefox, or WebKit — plus dedicated
Chrome and Microsoft Edge channels via "Chrome for Testing" builds, useful when you need the exact
binary your users run). A `BrowserContext` is an isolated session inside that browser: its own
cookies, storage, and cache, created in milliseconds because it doesn't relaunch the browser
process. A `Page` is a tab inside a context. Test isolation in Playwright Test comes from a fresh
context (and by default a fresh page) per test, not from resetting a shared one, which is why
tests can run in full parallel across workers without leaking login state or leftover
`localStorage` between them.

## Locators are lazy queries, and strict by default

```ts
const button = page.getByRole('button', { name: 'Submit order' });
await button.click();
```

`page.getByRole(...)` does not query the DOM when you call it — it returns a `Locator`, a
description of how to find the element, resolved fresh every time you act on it or assert against
it. That laziness is what makes auto-waiting possible (next section) and what makes a locator safe
to store and reuse across a retry. The query strategies, in the order Playwright's own docs
recommend them: `getByRole` (accessible role and name — the same accessibility tree a screen reader
sees), `getByLabel`, `getByPlaceholder`, `getByText`, then structural escapes: `getByTestId` for
anything with no accessible story, `.filter({ hasText, has })` to narrow a locator by content or a
nested locator, `.and()` to intersect two locators, `.or()` to match either, and `.locator(css)` to
chain a raw CSS/XPath selector when nothing else fits. `getByRole` first is the same argument
Testing Library makes for `getByRole` over `data-testid` in component tests — a role-based query is
a proxy for "can a real user, including one using assistive tech, find this."

Locators are **strict** by default: calling `.click()`, `.textContent()`, or almost any other
action/assertion on a locator that currently matches more than one element throws
`strict mode violation: locator('...') resolved to 3 elements`. This is a feature, not a
limitation — a locator that quietly clicks "whichever button matched first" is a bug waiting to
happen the next time someone adds a second button with similar text. `.first()`, `.last()`, and
`.nth(n)` exist to opt out explicitly when you mean it.

## Auto-waiting and actionability

The single biggest reason Playwright tests are less flaky than a hand-rolled `Selenium` script is
that every action waits for the element to be **actionable** first: attached to the DOM, visible,
not obscured, stable (not mid-animation — same bounding box across two consecutive frames),
enabled, and, for form inputs, editable. `page.click()` performs this wait internally, retrying
the actionability checks for up to the configured timeout (30s default) before giving up — you
almost never write your own `sleep()` or polling loop. **Web-first assertions** extend the same
idea to checking things: `await expect(locator).toHaveText('Order confirmed')` retries the
assertion until it passes or times out, instead of the plain Node `assert` you'd use in a unit
test, which checks once and fails immediately if the DOM hasn't caught up yet. Reach for
`test.step('fill shipping address', async () => { ... })` to name a chunk of actions — it groups
them in the trace viewer and the HTML report without changing behavior.

## Fixtures, projects, and the trace viewer

`test.extend<TestArgs, WorkerArgs>({ ... })` is Playwright Test's dependency-injection system: a
fixture like `page` itself, or a custom one like `authenticatedPage`, is declared once with a setup
(and optional teardown) function and then requested by name as a parameter to any test that needs
it — request it, and it runs; never request it, and it never runs. Fixtures scoped `{ scope:
'worker' }` run once per worker process (a browser launch, a seeded database connection) instead of
once per test, which is where most of the speedup in a large suite comes from. The most common
worker-scoped win is authentication: log in once, call `await page.context().storageState({ path:
'auth.json' })` to snapshot cookies and `localStorage`, and every subsequent test's context loads
with `storageState: 'auth.json'` already signed in — no UI login step repeated hundreds of times.
The `projects` array in `playwright.config.ts` is how you run the same test file against a matrix
(Chromium, Firefox, WebKit, plus device presets like `devices['iPhone 15']` for mobile emulation)
without duplicating a single test.

When a test does fail, the trace viewer is the reason Playwright debugging doesn't mean "add a
screenshot and guess": `trace: 'on-first-retry'` (or `'on'` while developing) records a full
timeline — DOM snapshots before and after every action, network requests, console logs, and
source-mapped stack traces — replayable with `npx playwright show-trace trace.zip` or inline in
the HTML report. `npx playwright test --ui` opens UI mode, the same trace timeline live while you
write and re-run tests, with a picker to click an element and get its locator. Both exist because
"it failed in CI and I can't reproduce it locally" is the single most expensive failure mode this
lesson's sibling on flakiness calls out — the trace *is* the reproduction.

## Further reading (optional)

- [Playwright: Locators](https://playwright.dev/docs/locators) — playwright.dev
- [Playwright: Actionability](https://playwright.dev/docs/actionability) — playwright.dev
- [Playwright: Test fixtures](https://playwright.dev/docs/test-fixtures) — playwright.dev
- [Playwright: Trace viewer](https://playwright.dev/docs/trace-viewer-intro) — playwright.dev
