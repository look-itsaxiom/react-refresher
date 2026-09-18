Every linter — ESLint, Biome, oxlint — is a tree walk that calls a rule's visitor
functions as it passes each node, plus a way for a rule to see the whole tree before
deciding to report anything. `App.tsx` gives you a tiny JSON-shaped AST (`LintNode`), two
fully-implemented rules that already assume the context your walker provides, and one
function left to finish: `lint(ast, rules)`.

## The node shapes

- `Program` and `FunctionDeclaration` each hold one array of child statements, `body`.
- `IfStatement` holds one or two arrays, `consequent` and (optionally) `alternate`.
- `CallExpression`, `VariableDeclaration`, `Identifier`, and `ReturnStatement` are leaves
  — they have no nested statement arrays.

`childArrays(node)` is already implemented: it returns every statement array a node
holds, in traversal order, so you don't need a `switch` per node type inside `walk`.

## What `walk` needs to do, in order

1. **Visit the current node.** For every `{ visitor, report }` pair in `instances`, look
   up `visitor[node.type]` and call it (if it exists) with `node` and a context object:
   `{ report, ancestors, precedingSiblings }`.
2. **Recurse into children.** For each array `childArrays(node)` returns, walk every
   element `arr[i]`, passing:
   - `ancestors` extended with the current node: `[...ancestors, node]`.
   - `precedingSiblings` as the elements of *that same array* before index `i`:
     `arr.slice(0, i)`.

After the top-level `walk(ast, [], [])` call returns, one thing is still missing: rules
that registered a `'Program:exit'` handler need it called once, with `ast` itself as the
node and empty ancestor/sibling arrays. This mirrors ESLint's real API — a rule gets a
listener for the moment traversal finishes, for exactly the case where a decision needs
information gathered across the whole tree.

## Why the two given rules need what they need

- `rulesOfHooksRule` reports a `CallExpression` whose name starts with `use` either when
  some ancestor is an `IfStatement` (called conditionally), or when an earlier sibling in
  the same body is a `ReturnStatement` (called after an early return). Both checks read
  directly off `ctx.ancestors` and `ctx.precedingSiblings` — get those two arrays right in
  `walk` and this rule needs no changes.
- `noUnusedVarsRule` can't know a declaration is unused until it's seen every `Identifier`
  in the tree, so it collects into two maps during the walk and only reports from
  `'Program:exit'`, once everything has been visited.

Nothing in either rule needs editing — get `walk` (and the `'Program:exit'` call after
it) right and both start reporting correctly.
