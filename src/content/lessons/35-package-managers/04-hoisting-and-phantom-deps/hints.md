Give `hoist` a `Map<name, version>` for what's currently at the top level, and a
`layout` object to fill in and return. Write a recursive helper, `place(node,
parentPath)`, and call it once with `place(root, '')`.
---
Inside `place`, loop over `node.deps`. For each `dep`, look up `dep.name` in the map.
Three outcomes: not present (hoist — set the map and `layout['node_modules/' +
dep.name]`, then recurse into `dep.deps` passing that new path as the parent path);
present with the same version (dedupe — do nothing, don't recurse); present with a
different version (nest — set `layout[parentPath + '/node_modules/' + dep.name]`, then
recurse into `dep.deps` passing *that* nested path as the new parent path).
---
For `phantomImports`, first build the set of names that are reachable at the top level:
filter `Object.keys(layout)` down to paths matching `/^node_modules\/([^/]+)$/` (a
single segment, no nested `node_modules` after it), and collect the captured names.
---
Then it's one filter over `imports`: keep a name if it's in that top-level name set
*and* it's not in `rootDeps`. Both conditions matter — dropping either one gives you a
function that's wrong in a way the checks will catch.
