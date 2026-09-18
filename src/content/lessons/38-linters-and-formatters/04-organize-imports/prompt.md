`organizeImports` is a string-in, string-out version of the import-sorting that Biome
and oxfmt run automatically: group imports by kind, sort and merge within each group,
and leave everything else in the file untouched. `App.tsx` already parses every import
line into a `ParsedImport` and classifies its module specifier into a group — your job
is the grouping, merging, and assembly `organizeImports` does with those pieces.

## What's already done

- `parseImportLine(line)` turns one import line into `{ kind: 'side-effect', source }` or
  `{ kind: 'named', isTypeOnly, module, specifiers }`. It only handles the two shapes
  this exercise's fixtures use — side-effect imports and named imports, `type` or not —
  so a default or namespace import parses to `null` and is skipped.
- `classify(moduleSpecifier)` returns `'node' | 'package' | 'alias' | 'relative'`.
- `renderNamed(imp)` turns one (already-merged) named import back into a single-quoted
  line, with its specifiers sorted alphabetically.
- `splitImportBlock(source)` finds the leading contiguous run of import/blank lines and
  returns them separately from everything after.
- `organizeImports` calls all of the above already, walks `importLines`, and pushes every
  side-effect import's original source line into `sideEffects` in order. Two gaps remain.

## Gap 1: merge parsed named imports into `named`

For every parsed named import, compute a key that identifies "the same import target":
same module specifier **and** same `isTypeOnly` — a type-only import and a value import
from the same module must stay as two separate entries, since merging them would need to
choose which keyword wins. If `named` already has an entry for that key, add any
specifier from `parsed.specifiers` that isn't already in `existing.specifiers` (so
`import { a } from 'x'` followed later by `import { a, b } from 'x'` ends up with just
`['a', 'b']`, not a duplicate `a`). Otherwise, set a new entry.

## Gap 2: bucket into groups, sort, and build the named-import blocks

Loop over `named.values()` and push each entry into `groups[classify(entry.module)]`.
Then sort each group's array by `.module` (plain string comparison — `localeCompare` or
`<` both work). Finally, for each group **in the order `node`, `package`, `alias`,
`relative`**, if it has any entries, render them with `renderNamed` and join with `\n`,
then push that joined string as one block onto `blocks` (the side-effect block, if any,
is already pushed before this).

`blocks.join('\n\n')` — already written — is what puts exactly one blank line between
each non-empty group, and no blank line between two imports inside the same group.
