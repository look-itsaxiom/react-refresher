# Your app is mostly other people's code

Run `npm ls --all` on a mid-sized React app and count. A typical project with a router,
a query library, a UI kit, and a build tool pulls in somewhere between 800 and 1,500
transitive packages, written by people you have never met, updated on schedules you
don't control, and executed with the same privileges as your own code the moment
`npm install` or `pnpm install` runs a lifecycle script. The line count of your own
`src/` directory is a rounding error next to that. This is not a React problem — it's
the shape of the modern JavaScript ecosystem — but React apps sit squarely in it, and
the last few lessons (lockfiles and hoisting in [[35-package-managers]], SRI for
third-party scripts in [[67-https-and-headers]]) have already circled the edges of it.
This lesson is the center: how the supply chain actually gets attacked, and what
meaningfully reduces the risk.

## How compromises actually happen

**Maintainer account takeover.** The attacker doesn't need to write malicious code from
scratch — they need one maintainer's npm credentials. In September 2025, the maintainer
of `chalk`, `debug`, `strip-ansi`, `color-convert`, and 15 other foundational packages
(collectively pulling **2–3 billion downloads a week**) received a phishing email
spoofing npm's branding, warning that "outdated 2FA credentials" would lock the account.
It worked. The attacker pushed malicious versions that hooked `fetch` and
`XMLHttpRequest`, scanned outgoing requests for cryptocurrency addresses across six
chains, and substituted attacker-controlled addresses chosen by Levenshtein distance to
look similar to the real one. Anyone who ran `npm install` in that window, on a project
with no cooldown, no pinned versions, and no lockfile discipline, pulled the malicious
code in transitively — most consumers of those packages had never heard of them by name.

**Self-propagating worms.** Days later, a second and structurally different attack
("Shai-Hulud") compromised **526 packages** across multiple waves. Instead of a payload
that acted on the victim's behalf, it added a `postinstall` script that ran
[TruffleHog](https://github.com/trufflesecurity/trufflehog) — a legitimate secret
scanner, repurposed — to harvest npm tokens, GitHub personal access tokens, and AWS/GCP/
Azure credentials from the machine running `install`. It validated what it found, then
used working npm tokens to publish itself into *more* packages the compromised developer
maintained, and working GitHub tokens to spin up roughly 700 public repositories named
"Shai-Hulud Migration" for persistence. This is the nightmare case for install scripts:
the exploit chain requires nothing more than running `npm install` on your own laptop.

**Typosquatting and dependency confusion.** `event-stream` (2018) was compromised when
its original author, burned out, handed maintainership to a stranger who added a
dependency (`flatmap-stream`) that targeted a specific bitcoin wallet app. `ua-parser-js`
(October 2021) was hijacked via stolen npm credentials to inject a cryptominer and
password stealer into a package with millions of weekly downloads. Neither required a
zero-day — both required a human developer to trust a name. Typosquatting (`raect`
instead of `react`) and dependency confusion (an internal package name like `@yourco/
utils` that also happens to resolve on the public registry, if your registry config
doesn't pin the scope) are the same trust exploited two different ways.

**Compromised CI, not just compromised packages.** The supply chain isn't only
`node_modules` — it's the CI pipeline that builds and ships your app. GitHub Actions
that reference a third-party action by a mutable tag (`uses: owner/repo@v4`) trust that
tag to keep pointing at the code you reviewed. In March 2025, a popular action
(`tj-actions/changed-files`, tracked as CVE-2025-30066) was compromised this way: the
attacker rewrote release tags to point at a malicious commit that dumped CI runner
secrets into workflow logs, and workflows across an estimated 23,000+ repositories ran
that code with the CI job's own secrets in scope. Pinning actions to an immutable commit
SHA closes this specific hole; a floating tag doesn't.

## The framework itself is part of the supply chain

It's tempting to think of "supply chain security" as strictly a dependency-tree problem,
but the framework you build on has the same exposure. In December 2025, an
**unauthenticated remote code execution vulnerability (CVE-2025-55182)** was disclosed
in React Server Components, affecting the 19.0, 19.1, and 19.2 lines; patches landed in
19.0.1, 19.1.2, and 19.2.1. A week later, researchers probing the fix found two more
issues — a denial-of-service path and a source-code-exposure path — in the same area.
None of this required a malicious dependency. It required running an RSC framework on an
unpatched React version, which is exactly the failure mode "keep dependencies current"
exists to prevent, just applied to the framework instead of a leaf package.

## The other supply chain: scripts you don't host

Everything above is about code that ends up in your build. There's a second supply
chain: third-party `<script src>` tags your pages load live, at request time, from
someone else's origin — analytics, chat widgets, ad tech, CDN-hosted libraries. In 2024,
attackers took over the abandoned `polyfill.io` domain and used it to serve malware to
every site that still pointed a `<script>` tag at it, without any of those sites
changing a line of their own code. Subresource Integrity, covered in
[[67-https-and-headers]], is the mitigation: an `integrity` hash pins the exact bytes
you reviewed, so a compromised or hijacked origin can serve whatever it wants and the
browser will simply refuse to run it.

## Further reading

- [Socket: npm author Qix compromised](https://socket.dev/blog/npm-author-qix-compromised-in-major-supply-chain-attack)
- [StepSecurity / Socket coverage of the Shai-Hulud worm](https://socket.dev/blog/ongoing-supply-chain-attack-targets-crowdstrike-npm-packages)
- [react.dev/blog — Critical Security Vulnerability in React Server Components](https://react.dev/blog)
- [GitHub Security Advisory: tj-actions/changed-files (CVE-2025-30066)](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)
