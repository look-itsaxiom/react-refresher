Start with the easy half of `reviewDependencyDiff`: iterate `Object.keys(before)` and
push a `'removed'` finding for any name missing from `after`. That doesn't depend on
metadata or "touched" logic at all.
---
Then iterate `Object.keys(after)`. A name is touched if `before[name] === undefined` or
`before[name] !== after[name]`. Handle `'added'` vs `'upgraded'` (+ the extra
`'major-bump'` check comparing the text before the first `.` in each version) first,
then layer the three metadata-driven findings (`hasInstallScript`, `maintainerChanged`,
`publishedDaysAgo`) on top — they all key off the same "is this name touched" check, so
compute that once per name and reuse it.
---
For `pinActions`, a regex like `/^(\s*uses:\s*)([\w.-]+\/[\w.-]+)@([^\s#]+)(.*)$/` against
each line gives you the leading whitespace + `uses:` prefix in group 1, the
`owner/repo` in group 2, and the ref in group 3. Test group 3 against `/^[0-9a-f]{40}$/i`
to detect an already-pinned SHA.
---
Once you have `owner/repo` and the ref, build the lookup key as `` `${ownerRepo}@${ref}`
`` and check it against `tagToSha`. If present, the new line is `` `${prefix}${ownerRepo}@${sha} # ${ref}`
``. If the line didn't match the `uses:` pattern at all, or the ref was already a SHA,
or the key wasn't in the map, return that line exactly as it came in.
