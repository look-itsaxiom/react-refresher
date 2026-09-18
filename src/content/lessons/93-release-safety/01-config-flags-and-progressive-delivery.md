# Config, flags, and progressive delivery

You already know how to build the app. This lesson is about what happens between "the
code is correct" and "every user has it safely" — the part that decides whether a bad
change costs you a rollback or an incident. It is September 2026; Vite 8, React 19.3.

## Environment config has two audiences

A static bundle has no server process reading `process.env` at request time — whatever
you ship is public. Vite's convention (unchanged since Vite 2, still current in Vite 8)
splits config into two kinds:

- **Build-time public config**: any env var prefixed `VITE_` is statically replaced into
  the bundle via `import.meta.env.VITE_*` at build time. It ships to every browser,
  readable in view-source. Fine for a public API base URL or a feature flag SDK client
  key meant to be public; never for a secret.
- **Runtime config injection**: for a container image (lesson 91) built once and deployed
  to several environments, build-time replacement is wrong — you'd need a separate image
  per environment. Instead, inject config at container start (an entrypoint script writing
  `window.__ENV__` into `index.html`, or a `/config.json` the app fetches before render)
  and read it at runtime, not from `import.meta.env`.

Vite's `.env` file precedence, highest to lowest: `.env.[mode].local` > `.env.[mode]` >
`.env.local` > `.env`. `.local` files are for the individual machine and are
`.gitignore`d by the Vite scaffold; `[mode]` files (`.env.production`, `.env.staging`)
are checked in and vary by target. `import.meta.env.MODE` reflects the `--mode` flag
(`production` by default for `vite build`), and `import.meta.env.PROD`/`DEV` are booleans
derived from it. None of this is a security boundary — it's a build-time text
substitution. Anything that must stay server-only (API secrets, signing keys) has no
business in a Vite env var at all; it belongs behind a backend endpoint the client calls.

**Validate config at startup, not at first use.** A missing `VITE_API_BASE_URL` that only
surfaces when the first fetch throws a cryptic network error is a bad failure mode. Parse
your resolved config through a schema (Zod, Valibot, or even a hand-written assertion) once
at module load, and throw a clear error immediately if it's wrong. This turns a
misconfigured deploy into a loud build-time or boot-time failure instead of a silent
runtime one users report to you.

## Release identification

When an error report comes in, "which deploy caused this" is the first question, and it's
unanswerable unless every build carries a stable version. The common approach: inject a
release identifier at build time via Vite's `define` — typically the git SHA or a semver
tag, read from CI's environment (`VITE_APP_VERSION` or similar) — and attach it to every
error report and analytics event.

Source maps make stack traces from a minified bundle readable again. The tradeoff:
shipping `.map` files publicly leaks your source. The standard pattern is `hidden-source-map`
in the bundler config (maps are generated and referenced, but the `//# sourceMappingURL`
comment is stripped from the shipped JS) combined with uploading the maps directly to your
error monitoring provider's servers (`@sentry/vite-plugin` does this for Sentry) and then
deleting them from the deploy artifact before it goes to your CDN. The maps exist only
where they're needed to symbolicate a stack trace, never in the public bundle.

"Release health" ties error monitoring to a release identifier: crash-free session rate
per release, so you can compare release `2026.09.18-a3f9c1` against the previous one and
see whether it's worse, not just look at a global error count that blends every version
still in the wild.

## Feature flags, done right

A feature flag is a runtime switch read by the app, separate from a deploy. This
separation — **deploy vs. release** — is the whole point: deploying ships code to
production inert; releasing turns a flag on so users actually see it. You can deploy
Friday afternoon with zero risk if nothing is enabled yet, and release Monday morning by
flipping a flag, no new deploy required.

There's no single standardized wire protocol yet, but OpenFeature (a CNCF project) defines
a common *vendor-neutral SDK shape* that most providers now implement an adapter for —
LaunchDarkly, Flagsmith, Unleash, PostHog, Statsig, and GrowthBook all ship OpenFeature
providers, and Vercel's `flags` package targets a similar evaluation model. Treat the
following as the shape that generalizes across them, not any one vendor's exact API
(verify the current OpenFeature spec version against openfeature.dev before quoting it in
production docs — this lesson doesn't rely on a specific version number):

- **Evaluation context**: the data used to decide a flag's value for this call — typically
  `{ userId, attributes }` (plan tier, region, signed-up-at, etc.).
- **Targeting rules**: `if these attributes match, serve this value` — used for beta
  cohorts, internal dogfooding, or region-specific rollouts.
- **Percentage rollout**: serve the new value to some stable percentage of users, holding
  everyone else back. "Stable" is the important word — the same user must get the same
  answer on every call, or the UI flickers between old and new on every re-render.
- **Kill switch**: an operator-facing override that forces a flag off (or to a fixed
  fallback) regardless of rules or rollout — the fastest rollback path there is, because it
  requires no deploy and no rebuild.

### Deterministic bucketing

Stability comes from **hashing**, not randomness. Real SDKs use fast, well-distributed
hashes (murmur3, xxhash); this lesson's exercise implements 32-bit **FNV-1a**, which is
simple enough to hand-verify and good enough to distribute users evenly across a
percentage rollout:

```ts
function fnv1a(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // FNV prime multiplication, kept in 32-bit range
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // unsigned 32-bit
}

function inRollout(flagKey: string, salt: string, userId: string, percentage: number): boolean {
  const bucket = fnv1a(`${flagKey}:${salt}:${userId}`) % 100;
  return bucket < percentage;
}
```

Hashing `flagKey + salt + userId` and reducing mod 100 gives a number in `[0, 100)` that's
stable for a given user and flag, uniformly distributed across users, and *independent
across flags* (a user in the 10% bucket for flag A isn't automatically in the 10% bucket
for flag B) as long as each flag mixes in its own key. The `salt` exists so you can
re-shuffle a rollout — bump the salt and every user gets a fresh bucket, useful when you
suspect the first 10% happened to be an unrepresentative sample.

**Precedence** matters and should be documented, not implicit: kill switch overrides
everything; then the first matching targeting rule; then the percentage rollout; then the
flag's default value. Each layer is a progressively less specific override.

### Flags flicker, and flags rot

Evaluating a flag client-side after first paint means the UI renders the "off" state, the
flag client finishes fetching, then it re-renders "on" — a flash of the wrong UI. The fix
is **bootstrapping**: the server (or an edge middleware) evaluates flags for the request's
context and inlines the results into the initial HTML/payload, so the client's first render
already has the right answer and the SDK only needs to keep it fresh after that.

A flag's job is temporary: ship the change safely, then delete the flag once it's at
100% and stable. Flags left in code for months become a second, undocumented branch of
your conditional logic — "flag debt" is a real maintenance cost, and mature teams track
flag age and alert on flags that have sat at 100%/0% for weeks without being removed. Not
every flag is a release flag, either — a flag controlling a permanent operational toggle
(rate limits, a kill switch for a flaky third-party integration) is fine to keep; a flag
that only exists to gate a finished rollout is the one that should die.

## Progressive delivery and the real rollback constraint

A canary release sends a small slice of traffic — by percentage, by region, or by a
request header for internal testing — to the new version before it takes 100%. Blue-green
deploys keep two full environments and switch traffic atomically. Both patterns exist to
make **the rollback itself cheap**: platforms like Vercel and Netlify keep every deploy as
an immutable, addressable artifact, so "roll back" is "repoint traffic at the previous
artifact," typically seconds, not a revert-and-rebuild (this echoes the immutable-deploys
model from lesson 89).

Feature-flag rollback and redeploy rollback solve different failure classes. A flag flip
undoes *behavior* instantly, with no build step, which is why "kill the flag" is almost
always the first response in an incident — it's faster than any redeploy, canary
rollback included. A code-level regression that isn't behind a flag needs an actual
rollback to the previous artifact.

The one thing neither trick fixes on its own: **database migrations**. If release N adds a
column release N+1 requires, and you roll back to N's code while the migration from N+1
already ran, you can end up with code that doesn't expect a column that exists, or vice
versa. The standard discipline is **expand/contract**: a migration first *expands* the
schema in a way both the old and new code can tolerate (add a nullable column, dual-write
old and new fields), you deploy the code that uses it, and only once you're confident do
you *contract* (drop the old column, make the new one required) in a later, separate
deploy. Never ship a migration that makes the previous release's code crash — that's what
turns "just roll back" into "we can't roll back."

## Further reading

- [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [OpenFeature: What is OpenFeature?](https://openfeature.dev/docs/reference/intro)
- [LaunchDarkly: Percentage rollouts](https://launchdarkly.com/docs/home/flags/rollouts)
- [Vercel: Instant Rollback](https://vercel.com/docs/deployments/rollbacks)
