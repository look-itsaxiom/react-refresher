# Making e2e cheap to own

A suite that works once and rots within a quarter isn't a strategy. The gap between "we have
Playwright tests" and "we trust the red X" is almost entirely about network control, data
strategy, and what you do the day a test flakes — not about writing more locators.

## Control the network, don't just hit it

`page.route(url, handler)` intercepts requests matching a glob or regex before they reach the
network, letting you `route.fulfill({ json: ... })` with a fixture, `route.abort()` to simulate an
outage, or `route.continue()` after inspecting/modifying headers. This is the same argument the
testing-strategy lesson makes for MSW over mocking a module: intercepting at the network layer
keeps your app's real `fetch` call, URL, and error handling under test. For a flaky third-party
widget (analytics, a chat bubble, an ad script) that isn't part of what you're testing, routing it
to a stub or aborting it removes a whole class of unrelated flakiness. `page.routeFromHAR(path)`
replays a previously recorded HAR file — record real traffic once with `--save-har`, then replay it
deterministically in CI without hitting the real backend at all; `page.route(url, ...)` and HAR
replay compose, so you can override a handful of endpoints while replaying everything else
recorded.

## Test data: seed it, don't click it into existence

The slowest, most fragile way to get a test into "checkout with 3 items in the cart" is clicking
through the add-to-cart UI three times. Prefer an API or database seed step in a fixture: call your
own backend's setup endpoint (or hit the database directly in a Node fixture) to create the account
and cart state you need, then start the browser already in that state — this is also exactly what
`storageState` buys you for authentication, extended to arbitrary app state. Clean up after
yourself in a fixture teardown (or accept a disposable per-test tenant/database if your backend
supports it) so a failed run doesn't leave junk that breaks the *next* run. The UI-driven path still
earns its place for the one or two flows where clicking through the real form **is** the thing
being tested — sign-up, checkout — just don't use it as a setup step for a test about something
else.

## Running against preview deploys

The highest-confidence place to run e2e is not `localhost` — it's the same infrastructure your
users hit. Vercel, Netlify, and Cloudflare Pages all generate a unique preview URL per pull
request; wire it into `playwright.config.ts` via `use: { baseURL: process.env.PLAYWRIGHT_BASE_URL }`
and set that env var from the platform's deployment-URL output in your CI job (each has a
documented way to expose it — a GitHub Actions output, a deployment webhook, or the platform's own
check run). This catches an entire category of bug a local run cannot: build-time env vars baked in
wrong, an edge-function region issue, a CDN caching an old asset. Gate the e2e job on the preview
actually being ready (poll the URL, or use the platform's "deployment succeeded" webhook) rather
than a fixed sleep after triggering deploy.

## Sharding, retries, and triage — not muting

`playwright test --shard=2/4` splits one run across 4 machines by test file, and `--shard`
combined with `reporter: [['blob']]` plus `npx playwright merge-reports` combines the per-shard blob
reports into one HTML report at the end — this is how a 40-minute suite becomes a 10-minute CI job
without losing a single unified report. `retries: 2` in CI config re-runs a failing test up to twice
before marking it failed, which absorbs genuine one-off infra hiccups — but a retry that turns red
consistently on attempt 1 and green on attempt 2 is a flake, not a pass, and the trace from the
failed attempt is still attached to the report specifically so you look at it. Give every flaky
test the same budget the earlier flakiness lesson argued for: fixed or quarantined within a sprint,
never left on permanent retry.

## Visual checks, accessibility scans, and where to stop

`await expect(page).toHaveScreenshot()` captures a full-page or element screenshot and diffs it
against a committed baseline, pixel-by-pixel with a configurable threshold — useful for a component
whose correctness *is* its pixels (a chart, a design-system primitive) and miserable as a default
for ordinary pages, which fail on every font hinting or OS rendering difference between your laptop
and CI. For anything beyond a handful of critical screens, outsource to Chromatic or Argos, which
solve cross-browser rendering diffs and review workflow properly instead of a local baseline file
nobody wants to update. `@axe-core/playwright`'s `new AxeBuilder({ page }).analyze()` runs the same
axe-core accessibility ruleset used in browser DevTools against the live page in your e2e run,
catching missing labels and contrast failures on real rendered output — cheap to add, and it
catches a different bug class than a component-level Testing Library check ever will (a role can be
correct in isolation and still be unreachable once real CSS and real focus order are involved).

## Authoring: codegen, and the agentic layer

`npx playwright codegen <url>` opens a browser where your clicks generate locator code live —
useful for a first draft or for grabbing an unfamiliar page's structure, not for a finished test
(codegen output tends to over-specify with brittle nth-child chains; hand-tune the locators after).
Playwright's component testing (`@playwright/experimental-ct-react`) mounts a single component in a
real browser for visual/interaction testing without a full page — genuinely useful for a
design-system primitive, but it's a middle layer between Testing Library and full e2e, not a
replacement for either. The newer agentic layer is Playwright MCP (`@playwright/mcp`), Microsoft's
official Model Context Protocol server that exposes a live, accessibility-tree-first Playwright
browser to an LLM agent — useful today for exploratory testing and generating a first draft of a
flow from a plain-English goal, immature as the primary way to author or maintain a suite you'd bet
CI on; verify what a given MCP server actually supports before adopting it, the space is moving
fast. On page objects versus fixtures: a page object class wrapping locators for one page is fine
for a large suite's readability, but prefer fixtures for anything cross-cutting (auth, seeded data,
API clients) — a fixture composes with other fixtures, a page object's constructor chain does not.

## Further reading (optional)

- [Playwright: Network](https://playwright.dev/docs/network) — playwright.dev
- [Playwright: HAR](https://playwright.dev/docs/mock#recording-a-har-file) — playwright.dev
- [Playwright: Sharding](https://playwright.dev/docs/test-sharding) — playwright.dev
- [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) — playwright.dev
- [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) — npmjs.com
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — github.com
