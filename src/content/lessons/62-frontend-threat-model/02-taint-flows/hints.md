Start with `isNeutralized`. Look up `SINK_SANITIZERS[sinkLabel]`. If that lookup is
`undefined` (the `in`/index-signature default), the sink isn't tracked at all -- return
`true` immediately. Otherwise you have an array of acceptable transform labels; check
whether any of them appears in `transformLabels` with `.some(...)` or `.includes` in a
loop.
---
`acceptable.some((label) => transformLabels.includes(label))` is the one-liner for the
"at least one acceptable transform was applied" check. An empty `acceptable` array makes
`.some` return `false` no matter what, which is exactly the "`eval` can never be safe"
rule -- you don't need to special-case it.
---
For the loop in `taintFlows`: iterate `candidates`, and for each one call
`isNeutralized(candidate.sinkLabel, candidate.transformLabels)`. `continue` past it if
that's `true`. Otherwise construct the `TaintPath` object and `flagged.push(...)` it.
---
Remember the severity lookup falls back to `'medium'` — `SINK_SEVERITY[candidate.sinkLabel]
?? 'medium'` — even though every sink in the sample data happens to have an explicit
entry, a fixture used to grade this might not.
