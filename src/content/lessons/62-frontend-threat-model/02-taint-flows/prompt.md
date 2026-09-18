A taint-flow graph models one frontend feature's data flow: **source** nodes are where
untrusted data enters (`location.hash`, a `fetch` response, user input), **transform**
nodes are things applied along the way (`sanitize`, `JSON.parse`, `encodeURIComponent`),
and **sink** nodes are where a value finally does something dangerous (`innerHTML`,
`eval`, `href`). `SINK_SANITIZERS` in `App.tsx` maps each sink to the transform labels
that make a value safe to reach it — a sink absent from that table (like `'React text'`,
which React escapes automatically) is always safe, and a sink present with an empty
array (`eval`) can never be made safe.

`collectSinkPaths` is already wired: it walks every path from a source to a sink and
hands you, for each one, the full node-id path and every transform label it passed
through. Two things are left:

## 1. `isNeutralized(sinkLabel, transformLabels)`

Return whether a path reaching `sinkLabel`, having passed through `transformLabels`
along the way, is safe:

- If `sinkLabel` has no entry in `SINK_SANITIZERS`, it's always safe — return `true`.
- If it has an entry, return `true` only if `transformLabels` contains at least one of
  the labels listed for that sink.
- An entry that's an empty array (only `eval`, currently) can never be satisfied.

## 2. The loop inside `taintFlows(graph)`

For each candidate path from `collectSinkPaths`, skip it if `isNeutralized(...)` says
it's safe. Otherwise, push a `TaintPath` — `{ path: candidate.path, sink:
candidate.sinkLabel, severity: SINK_SEVERITY[candidate.sinkLabel] ?? 'medium' }` — onto
the result.

The default `App` renders every flagged flow from a sample graph so you can see your
function's output.
