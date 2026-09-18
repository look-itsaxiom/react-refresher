Start with a helper that costs one field against a type name:
`fieldCost(schema, typeName, field, weights, listMultiplier)`. Look up `fieldDef =
schema.types[typeName]?.fields[field.name]`; if it's missing, return `1` and stop (no
children to walk). Otherwise get `weight = weights[`${typeName}.${field.name}`] ?? 1`.
---
Deciding "is this field a list" is just `fieldDef.type.kind === 'list'`. When it is, the
child type name comes from `fieldDef.type.of` (unwrap once — `of.kind === 'named' ?
of.name : ...` — for this exercise you can assume lists aren't nested two deep). When
it's `'named'`, the child type name is `fieldDef.type.name` directly.
---
The multiplier: check `field.args.first` and `field.args.limit` — both are `ArgValue`s
(`{ kind: 'literal', value }` or `{ kind: 'variable', name }`). Only a `literal` with a
`number` value counts; anything else (missing, or a variable — you don't know its
runtime value statically) falls back to `options.listMultiplier ?? 10`.
---
`childCost` is `(field.selectionSet ?? []).reduce((sum, child) => sum + fieldCost(schema,
childTypeName, child, ...), 0)`. Then `cost = weight + multiplier * childCost` if it's a
list, or `weight + 1 * childCost` (i.e. just `weight + childCost`) if it isn't.
---
For depth, write a small recursive `depthOf(fields)`: `fields.length === 0 ? 0 : 1 +
Math.max(...fields.map((f) => depthOf(f.selectionSet ?? [])))`. Call it on the
top-level selection set directly — a flat query with no nested selections gives `1`
this way (the top-level array itself is the first level).
---
`queryCost` itself: `rootType = document.operation === 'mutation' ? schema.mutation! :
schema.query`, `cost = selectionSet.reduce((sum, f) => sum + fieldCost(schema, rootType,
f, ...), 0)`, `depth = depthOf(selectionSet)`, then build `reasons` from comparing
against `maxDepth`/`maxCost`.
---
For `chooseApiStyle`, track `scores = { rest: 0, graphql: 0, trpc: 0 }` and a `reasons:
string[]`, apply rule 1 first and set a `trpcDisqualified` flag, then rules 2–4 (guarding
rule 3 on `!trpcDisqualified`). If `trpcDisqualified`, force `scores.trpc = -Infinity`
right before picking a winner so it can never be selected by accident even if you forget
the guard on rule 3. Pick with a small loop over `['rest', 'graphql', 'trpc']` in that
order, keeping the first entry whose score is `>` the current best (not `>=`) so the tie
preference lands on `rest` first.
