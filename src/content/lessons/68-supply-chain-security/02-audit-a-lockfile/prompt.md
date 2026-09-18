A security review needs a script, not a human, to scan a lockfile against policy. You'll
implement two pure functions: one that audits a simplified lockfile against a policy
object, and one that flags likely typosquats in a list of package names.

## The data

```ts
type PackageEntry = {
  name: string;
  version: string;
  publishedAt: string; // ISO date, e.g. '2026-09-10'
  integrity?: string;
  hasInstallScript: boolean;
  provenance?: boolean;
  resolvedRegistry: string;
};

type Lockfile = { packages: PackageEntry[] };

type Policy = {
  minimumReleaseAgeDays: number;
  allowedRegistries: string[];
  allowInstallScripts: string[]; // package names allowed to run install scripts
  requireIntegrity: boolean;
  requireProvenanceFor: string[]; // package names that must carry provenance
};

type Finding = { severity: 'high' | 'medium' | 'low'; package: string; kind: string; message: string };
```

## `auditLockfile(lock, policy, now)`

`now` is an ISO date string. `daysBetween(now, publishedAt)` is already written for you
— use it instead of doing date math yourself.

For **each package**, push a `Finding` for every rule it violates (a package can trigger
more than one):

- **`'too-new'`** (`severity: 'high'`) — `daysBetween(now, pkg.publishedAt) <
  policy.minimumReleaseAgeDays`.
- **`'unallowed-install-script'`** (`'high'`) — `pkg.hasInstallScript` is true and
  `pkg.name` is not in `policy.allowInstallScripts`.
- **`'missing-integrity'`** (`'medium'`) — `policy.requireIntegrity` is true and
  `pkg.integrity` is missing.
- **`'unexpected-registry'`** (`'high'`) — `pkg.resolvedRegistry` is not in
  `policy.allowedRegistries` (this is the dependency-confusion signal).
- **`'missing-provenance'`** (`'medium'`) — `pkg.name` is in
  `policy.requireProvenanceFor` and `pkg.provenance` is not `true`.

Then, **once per package name** (not once per entry): if that name appears in
`lock.packages` under more than one distinct version, push a `'duplicate-version'`
finding (`severity: 'low'`) — exactly one finding for that name, regardless of how many
duplicate entries there are.

The `message` text on each finding isn't checked — write whatever's useful. The `kind`
string, `severity`, and `package` fields are.

## `typosquatSuspects(names, popular)`

Given a list of package `names` someone is about to add and a list of `popular`,
well-known package names, return the ones that are suspiciously *close* to a popular
name without *being* one — a classic typosquat shape (`raect` vs `react`).

"Close" means: **Levenshtein edit distance of 1 or 2** from at least one entry in
`popular`. `levenshtein(a, b)` is already written for you. Exclude any name that
exactly matches an entry in `popular` (distance 0 isn't a typosquat, it's the real
thing). Return suspects in the same order they appear in `names`, with no duplicates.
