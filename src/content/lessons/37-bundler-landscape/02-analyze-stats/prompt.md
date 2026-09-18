Every bundler that produces a production build can also emit a stats/metafile
describing what it built: which chunks exist, which modules ended up in each one, and
how big everything is. Reading that file by eye doesn't scale past a handful of
chunks — this is the kind of thing you write a small script against. `App.tsx` gives
you a synthetic `Stats` shape (`chunks`, each with `modules`) and asks you to finish
`analyzeStats`, which should surface four things a real build-size audit cares about.

## 1. `largestChunks`

For each chunk, sum its modules' `size`. Sort the chunks by that total, descending, and
keep the first `topN` as `{ name, size }`.

## 2. `sharedModules`

Build a map from module id to the set of chunk names that include it (walk every
chunk's `modules`). Any module id whose set has more than one chunk name is a shared
module — in a real build this usually means a dependency got duplicated into multiple
entry chunks instead of being split into its own shared chunk. Return the list of such
ids, each once.

## 3. `duplicatedPackages`

A module id for a third-party dependency looks like
`node_modules/<pkg>@<version>/<rest>` (or `node_modules/@scope/pkg@<version>/<rest>`
for a scoped package) — `PACKAGE_ID_RE` is provided and captures the package name
(group 1) and version (group 2). For every distinct module id across the whole stats
object, match it against `PACKAGE_ID_RE` and record the version against that package
name (a `Set`, so seeing the same version twice doesn't count twice). Any package name
whose set of versions has more than one entry is a duplicated package — two different
versions of the same dependency shipped in the same build. Return
`{ name, versions }` for each (versions in any order); ignore module ids that don't
match the regex at all (your own source files).

## 4. `totalGzipEstimate`

Walk every module id across every chunk, but **deduplicate by id first** — the same
dependency duplicated into two chunks (as in `sampleStats`, below) should only be
counted once here, even though it's flagged separately in `sharedModules`. Sum the
`gzipSize` of each distinct id.

`sampleStats` at the bottom of the file gives you a small worked example: `lodash` is
duplicated verbatim into both chunks (a `sharedModules` hit, but not a
`duplicatedPackages` hit — same version both times), while `date-fns` appears at two
different versions across the two chunks (a `duplicatedPackages` hit).
