# Controls that actually help

None of the incidents in the last step required a novel attack technique. Every one of
them was stopped, somewhere, by a team that had one of the controls below already
turned on. None of these are exotic; most are a config flag or a CI step you're
probably one PR away from having.

## Lockfiles: commit them, and make CI refuse to touch them

[[35-package-managers]] covered what a lockfile *is*. The security-relevant part is what
CI does with it. Plain `npm install` will happily re-resolve and rewrite the lockfile if
`package.json` drifted, or if a range like `^4.1.0` now has a newer in-range publish
available — which is exactly how a same-day malicious patch release reaches a "locked"
project. `npm ci`, `pnpm install --frozen-lockfile`, and `yarn install --immutable` all
do the opposite: they fail loudly if the lockfile and manifest don't already agree,
instead of silently updating anything. CI should never run plain `install`.

The lockfile also carries **integrity hashes** — a SHA-512 of the exact tarball, checked
on every install regardless of frozen mode. A compromised registry mirror or a
person-in-the-middle can't swap the bytes without the hash failing.

## Minimum release age: the highest-leverage single setting

Most malicious package versions get caught and unpublished within hours to a couple of
days — the Qix/chalk incident and Shai-Hulud were both detected and pulled the same day
or the next. A **minimum release age** exploits that pattern directly: refuse to install
any version, including transitive ones, until it has been public for some cooldown
period. pnpm shipped this as `minimumReleaseAge` (introduced in 10.16.0) and turned it
**on by default at 1,440 minutes — 24 hours — starting in pnpm 11** (April 2026),
specifically in response to the late-2025 wave of attacks. `minimumReleaseAgeExclude`
lets you carve out exceptions (your own scope, a package you need same-day) without
disabling the protection globally. As of this course's research date, npm and Bun don't
ship an equivalent built-in cooldown — if you're not on pnpm 11+, Renovate/Dependabot
scheduling (below) is your substitute.

## Install scripts: default to off, allowlist what needs them

A `postinstall` script runs arbitrary code, with your permissions, the moment `install`
finishes — Shai-Hulud's entire propagation mechanism *was* a postinstall script. pnpm
has not run dependency lifecycle scripts by default for years; since pnpm 10 you
explicitly allowlist which packages are trusted to run native-build steps via
`pnpm.onlyBuiltDependencies` in `package.json` (or `pnpm approve-builds`
interactively). npm and classic Yarn still run install scripts by default; both accept
`--ignore-scripts` as a blunt global override. The tradeoff is real — some packages
genuinely need a native build step (bcrypt, sharp) — which is exactly why an allowlist,
not a blanket ban, is the sustainable version of this control.

## Provenance, attestations, and trusted publishing

npm supports **provenance attestations**: a package built and published through a CI
pipeline (not a developer's laptop) can carry a signed, publicly verifiable statement
of which source commit and workflow produced it. `npm audit signatures` checks that
your installed tree's provenance and registry signatures actually verify. **Trusted
publishing** (OIDC-based, no long-lived npm token stored in CI at all) removes the
token-theft attack surface that both major 2025 incidents ultimately depended on —
there was no static credential to phish or exfiltrate in the first place.

## Defeating dependency confusion

If your org publishes internal packages under a scope (`@yourco/*`), make sure your
`.npmrc` pins that scope to your private registry explicitly
(`@yourco:registry=https://your-registry`), rather than trusting the default resolution
order. Without that, a public package published under the same name — deliberately, by
an attacker, or accidentally — can resolve instead of your real internal one.

## Automated updates, on a schedule that isn't "immediately"

Dependabot and Renovate both support grouping (bundle a wave of patch bumps into one PR
instead of forty) and a **cooldown** period before a bump is even proposed. Combined
with minimum release age, this means routine updates land days after publish, when the
"was this pulled for being malicious" question has already been answered by the
ecosystem.

## Scanning, and its real cost

`npm audit`, `pnpm audit`, and third-party scanners (Socket, Snyk, OSV) all check known
vulnerabilities against your tree. They catch real things and also generate real noise
— a transitive dev-only dependency with a moderate CVE in a code path you never execute
still shows up as a finding. Treat scanner output as triage input, not a merge gate by
itself; a team that ignores 200 audit warnings because 190 were noise will also miss the
one that mattered.

## SBOMs, for when someone asks

A **Software Bill of Materials** (CycloneDX or SPDX format; `npm sbom` generates one) is
a structured, machine-readable list of everything in your build. Most teams don't
generate one until a customer's security questionnaire or a regulatory requirement asks
for it — but it's the artifact that makes "which of our products used the compromised
version of `debug`" a five-minute query instead of a fire drill.

## CI itself: pin actions, scope secrets

Pin third-party GitHub Actions to a commit SHA, not a tag — `uses: owner/repo@<sha> #
v4` instead of `uses: owner/repo@v4` — so a compromised tag can't silently swap the code
your workflow runs. Prefer OIDC-issued, short-lived credentials over long-lived secrets
stored in repo settings, and scope any token to the minimum it needs.

## When it happens anyway: an incident checklist

1. **Rotate** every credential that touched the affected install — npm tokens, GitHub
   tokens, cloud keys — assume anything in scope was read.
2. **Diff the lockfile** against the last known-good commit; look specifically at
   *transitive* changes you didn't intend.
3. **Check for new or changed install scripts** on anything that changed.
4. **Run `npm audit signatures`** and check provenance on anything suspicious.
5. **Review CI logs** for the affected window for unexpected network calls or publishes.

## Further reading

- [pnpm settings — `minimumReleaseAge`](https://pnpm.io/settings/dependency-resolution)
- [npm docs — provenance and `audit signatures`](https://docs.npmjs.com/generating-provenance-statements)
- [npm docs — trusted publishing with OIDC](https://docs.npmjs.com/trusted-publishers)
- [GitHub docs — securing GitHub Actions with SHA pinning](https://docs.github.com/actions/security-guides/security-hardening-for-github-actions)
