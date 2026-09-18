Start with `compareVersions`. Compare `major`, then `minor`, then `patch` — return `1`
or `-1` on the first difference. If all three are equal, a version *without* a
prerelease always beats one *with* a prerelease (`1.2.3` > `1.2.3-anything`), and if
both are missing, they're equal (`return 0`).
---
If both versions have a prerelease and the `major.minor.patch` triple ties, you need to
compare the prerelease identifiers themselves — that logic (`compareIdentifiers`) is
genuinely fiddly and isn't the point of this exercise, so it's fine to write something
simple: split both on `.`, and compare segment by segment, treating an all-digit segment
as a number and anything else as a string, with numeric segments always sorting below
non-numeric ones. If one runs out of segments first, it's the smaller version.
---
For `versionSatisfiesComparator`, call `splitComparator(comparator)` to get `{ op, base
}`, then `switch` on `op`. `'*'` is always true. `'='` is `compareVersions(v, base) ===
0`. `'>='` is `compareVersions(v, base) >= 0`. `'<'` is `compareVersions(v, base) < 0`.
---
For `'^'` and `'~'`, you already have the upper bound: `caretUpper(base)` and
`tildeUpper(base)` are exclusive ceilings. Both operators are "at least the base version,
and strictly less than the ceiling" — the same shape as `>=` combined with `<`, just
against two different values instead of one comparator's `base`.
