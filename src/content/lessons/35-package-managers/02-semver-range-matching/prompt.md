This is the constraint-satisfaction step from the last concept, made concrete: given a
range string like `^1.2.3` and a bag of published versions, which ones actually qualify,
and which one would a resolver pick? You'll implement a working subset of node-semver.

## The version format

`major.minor.patch` with an optional prerelease suffix: `1.2.3` or `1.2.3-beta.1`.
`parseVersion` is already written for you.

## The range grammar (a subset)

A **range** is one or more clauses joined by `||` (OR). A **clause** is one or more
**comparators** separated by whitespace (AND — all must hold). A comparator is one of:

- `*` — matches anything (except prereleases — see below).
- `1.2.3` — exact match.
- `^1.2.3` — compatible-with: locks the left-most non-zero component. For a normal
  major (`^1.2.3`), that's `>=1.2.3 <2.0.0`. For a zero major (`^0.2.3`), it's
  `>=0.2.3 <0.3.0` — npm treats `0.x` as "everything is potentially breaking," so caret
  only protects the *patch*. For zero major **and** zero minor (`^0.0.3`), it's
  `>=0.0.3 <0.0.4` — only that exact patch.
- `~1.2.3` — patch-level only: `>=1.2.3 <1.3.0`, regardless of major/minor being zero.
- `>=1.2.3` / `<1.2.3` — plain numeric comparators.

(Ranges in this subset always give a full `major.minor.patch` after `^`/`~`/`>=`/`<` —
no partial versions like `1.2.x`.)

## The prerelease rule

A prerelease version (`2.0.0-rc.1`) is unstable by definition, so it should never
satisfy a range unless that range was clearly written with awareness of *that specific*
`major.minor.patch`. The rule: **a version with a prerelease tag can only satisfy a
clause if at least one comparator in that clause also has a prerelease tag with the
same `major.minor.patch`.** `^2.0.0-rc.1` can match `2.0.0-rc.2`; `^2.0.0` cannot match
`2.0.0-rc.2` even though `2.0.0-rc.2 < 2.0.0` — the clause never mentioned a `2.0.0`
prerelease, so it's excluded outright, before any numeric comparison happens. This
exclusion is already wired up in `satisfies`; you don't need to touch it.

## What's already written

`parseVersion`, `splitComparator` (breaks a comparator into an operator and a base
`Version`), `caretUpper`/`tildeUpper` (the exclusive upper bound for `^`/`~`), and the
outer `satisfies`/`maxSatisfying` functions (which split on `||`/whitespace and apply
the prerelease exclusion above) are done.

## What you implement

1. **`compareVersions(a, b)`** — return `-1`, `0`, or `1`. Compare `major`, then
   `minor`, then `patch` numerically. If all three tie: no prerelease beats having one
   (`1.2.3` > `1.2.3-beta`); if both have one, compare their dot-separated identifiers
   left to right — numeric identifiers compare numerically, non-numeric identifiers
   compare as strings, and a numeric identifier always sorts below a non-numeric one at
   the same position (`1.0.0-2` < `1.0.0-alpha`). If one prerelease's identifiers run
   out first and everything so far tied, it's the smaller one (`1.0.0-alpha` <
   `1.0.0-alpha.1`).
2. **`versionSatisfiesComparator(v, comparator)`** — use `splitComparator` to get the
   operator and base version, then: `*` is always `true`; `=` (exact) is
   `compareVersions(v, base) === 0`; `>=` is `compareVersions(v, base) >= 0`; `<` is
   `compareVersions(v, base) < 0`; `^`/`~` are true when `v` is `>=` the base and `<`
   `caretUpper(base)`/`tildeUpper(base)`.

`maxSatisfying` (already wired) filters with `satisfies` and reduces with
`compareVersions` to find the largest match.
