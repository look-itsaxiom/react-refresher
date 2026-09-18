Start with `segmentToPatternPart`. Three regexes, tried in order: `/^\[\.\.\.(\w+)\]$/`
for catch-all, `/^\[(\w+)\]$/` for dynamic, `/^\(.*\)$/` for a group. Whichever matches
first wins; if none match, it's a static segment and you return it unchanged.
---
For the catch-all and dynamic cases, the captured group (`match[1]`) is both the param
name and, prefixed with `*` or `:`, the pattern part. For the group case, return
`{ part: null }` — `buildRoutes` already skips `null` parts when assembling
`patternParts`.
---
For the `matchRoute` loop: iterate `i` from `0` to `patternSegments.length - 1`. Check
`patternSeg[0]` to tell static (`patternSeg === urlSegments[i]`, add 2 to score, or bail
with `matched = false` on mismatch), dynamic (starts with `':'`, always matches, store
`urlSegments[i]` under the name after the colon, add 1), or catch-all (starts with `'*'`,
always matches, store `urlSegments.slice(i)` — everything from here to the end — under
the name after the `*`, add 0). The catch-all case only ever appears last, so you don't
need to worry about segments after it.
---
Remember `matched` needs to actually stop the loop (`break`) once a static segment fails,
otherwise you'll keep writing bogus params for the remaining segments. And the outer
"keep the best" comparison (`if (!best || score > best.score)`) is already written for
you below the loop — you just need `params` and `score` to be filled in correctly by the
time it runs.
