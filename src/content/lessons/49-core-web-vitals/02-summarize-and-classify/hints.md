Start with `p75`. Sort a copy of the values ascending (don't mutate the input array), then
compute `rank = Math.ceil(0.75 * values.length)`. That rank is 1-indexed, so the value you
want is at `sorted[rank - 1]`.
---
For `summarizeVitals`, build up two `Map`s while iterating the samples once: one keyed by
metric name (for `overall`), one keyed by url then metric name (for `byUrl`). Push each
sample's value onto the right array. Only after the loop, convert each `Map` into a plain
object, calling your `p75` + `classify` helpers once per group. A metric with no samples
in a given group should never appear as a key in that group's object — since you only
create map entries for metrics that actually showed up, this falls out naturally as long
as you don't pre-seed the maps.
---
For `inpFromInteractions`, sort a copy of the interactions **descending**. The number of
interactions to discard from the top is `Math.floor(interactions.length / 50)` — 0 for 50
or fewer, 1 for 51-100, 2 for 101-150, and so on. The answer is the value at that index in
the descending-sorted array (clamp the index to the array's last valid index so a tiny
array with a huge discard count doesn't read past the end).
---
Sanity-check against the fixture: with 10 interactions the discard count is 0, so
`inpFromInteractions` should just return the single largest value in the array (610 in the
starter's fixture).
