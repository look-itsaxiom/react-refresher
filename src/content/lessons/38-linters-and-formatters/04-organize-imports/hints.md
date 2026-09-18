For the merge step, the key needs both pieces of identity:
`` const key = `${parsed.isTypeOnly ? 'type' : 'value'}:${parsed.module}`; ``
Look it up with `named.get(key)`. If it exists, loop `parsed.specifiers` and for each one
do `if (!existing.specifiers.includes(specifier)) existing.specifiers.push(specifier);`.
If it doesn't exist, `named.set(key, { isTypeOnly: parsed.isTypeOnly, module: parsed.module, specifiers: [...parsed.specifiers] })`
(copy the array — don't reuse `parsed.specifiers` by reference).
---
For bucketing: `for (const entry of named.values()) { groups[classify(entry.module)].push(entry); }`.
Then, separately, sort each group in place:
`for (const key of Object.keys(groups) as ImportGroup[]) { groups[key].sort((a, b) => a.module.localeCompare(b.module)); }`.
---
For the blocks, the order matters and it's fixed, not derived from `Object.keys`:
`for (const key of ['node', 'package', 'alias', 'relative'] as ImportGroup[]) { if (groups[key].length > 0) blocks.push(groups[key].map(renderNamed).join('\n')); }`.
Each group becomes exactly one string in `blocks` — even if it has three imports in it,
they're joined with a single `\n`, not pushed as three separate block entries (that's
what would introduce a blank line *inside* a group instead of only between groups).
