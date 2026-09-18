`OperatorsFor<F>` is a chain of two conditional checks, one per non-default case, ending in
an `else` for whatever's left: `F extends 'number' ? {...} : F extends 'string' ? {...} : {...}`.
---
Each branch is a plain object type with optional (`?`) properties — optional because a
caller filtering on `age` shouldn't be forced to supply every operator, just the ones they
want: `{ eq?: number; gt?: number; lt?: number }` for numbers, and so on.
---
For `buildQuery`, a `for...in` loop over `filters` gives you field names; `filters[field]`
gives you that field's operator object (which might be `undefined` if the field key exists
in the type but wasn't actually filtered on in this call — skip it with `if (!ops) continue`).
A nested `for...in` over `ops` gives you operator names.
---
Reading an operator's value generically needs a cast, since `ops`'s real type varies per
field: `const value = (ops as Record<string, unknown>)[op];`. Skip when `value === undefined`,
otherwise push `` `${field}.${op}=${encodeURIComponent(String(value))}` ``.
---
If a check reports the wrong number of pieces, log `result.split('&')` — a common mistake
is pushing an empty-string piece for a field whose filter object exists but has no
operators set (every value `undefined`), which the `undefined` check should prevent, or
forgetting the `continue` when `ops` itself is missing.
