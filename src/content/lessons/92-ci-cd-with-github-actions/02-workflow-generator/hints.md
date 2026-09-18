Build `buildFrontendWorkflow` as a set of small job-builder functions
(`installAndCheckJob`, `buildJob`, `e2eJob`, `previewJob`) that each return a `Job` object,
then assemble `jobs` as a plain object literal, adding the `e2e`/`preview` keys
conditionally with an `if`. Object key **insertion order** is what the emitter walks, so
building `jobs` in the order `install-and-check`, `build`, `e2e`, `preview` is what makes
the YAML come out in that order.
---
Share a `checkoutStep()` and a `setupSteps(opts)` helper between `install-and-check`,
`build`, and `e2e` — they all need to check out and set up Node the same way. Each job
still needs its *own* `checkout`/`setup` steps even though `install-and-check` already ran
them: jobs run on separate runners with no shared filesystem, so `build` and `e2e` start
from nothing.
---
For `toYaml`, write one recursive function that takes a value and an indent level and
pushes lines into an array (join with `'\n'` at the end — much easier than string
concatenation). Branch on `typeof value` and `Array.isArray(value)` first. The one fiddly
case is an object that's an item in an array (a step): its first key needs a `- ` prefix
instead of the normal indent, and every key after the first needs the normal deeper
indent — handle that as "if this is the first key of a list-item object, use
`indent - 1` spaces plus `'- '` instead of a plain `indent` pad."
---
For quoting: you don't need a fully correct YAML quoting algorithm, just enough to keep
this emitter's own output parseable. A cheap, sufficient rule: quote a string if it's
empty, starts with one of `` -?:,[]{}#&*!|>'"%@` ``, looks like `true`/`false`/`null`/a bare
number, or contains `": "` (a colon followed by a space, which would otherwise look like a
new key). Everything else — action refs like `actions/checkout@v7`, template expressions
like `${{ matrix.shard }}`, branch names — can go out unquoted.
---
For the multi-line `run` block: detect `value.includes('\n')`, then push a line
`` `${key}: |` `` at the current indent, and push each line of `value.split('\n')`
indented one level deeper than that line. A single-line `run` (or any other string field)
just falls through to the normal scalar case.
