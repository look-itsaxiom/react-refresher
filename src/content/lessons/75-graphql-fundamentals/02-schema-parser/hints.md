Start with `parseSdl`. Each regex is meant to be used with `for (const m of
SCALAR_RE.matchAll(sdl))` (note: `matchAll` needs the regex to have the `g` flag, which
all six already have). Inside each loop, `m[1]`, `m[2]`, `m[3]` are the capture groups
described in the prompt — write `types[m[1]!] = { kind: '...', name: m[1]!, ... }` for
each of the six kinds, in any order (they don't depend on each other). For `ENUM_RE`,
`m[2]!.split(/\s+/).filter(Boolean)` gives the value names. For `UNION_RE`,
`m[2]!.split('|').map((s) => s.trim())` gives the members.
---
For `TYPE_RE`'s optional `implements` group: `m[2] ? m[2].split('&').map((s) =>
s.trim()) : []`. Don't forget `parseFieldBlock(m[3]!)` for the field map — it's fully
written for you, just call it with the right capture group.
---
For `validateSchema`, step 2 needs to walk every type that has `fields` (`object`,
`interface`, `input` — the `kind` discriminant tells you which). For each field, check
`namedTypeOf(field.type)`, then loop `Object.entries(field.args)` and check
`namedTypeOf(argType)` too. A helper like `const BUILTINS = new Set(['ID', 'String',
'Int', 'Float', 'Boolean'])` and `if (!schema.types[name] && !BUILTINS.has(name))
errors.push(...)` covers both cases if you extract a tiny local function for "check one
type name."
---
For step 3, `schema.types[objectName]` is guaranteed to be `kind === 'object'` (you're
iterating those), so `.implements` and `.fields` both exist on it. For each interface
name in `implements`, look up `schema.types[interfaceName]` — if it's missing or not an
`interface`, skip it (that's already a step-2 error, don't double-report). Otherwise
loop its `fields`, and for each one check `objectType.fields[fieldName]` exists and
`namedTypeOf(objectType.fields[fieldName].type) === namedTypeOf(interfaceField.type)`.
---
Step 4 is the shortest: for every `types` entry with `kind === 'union'`, loop
`.members`, and for each member check `schema.types[member]?.kind === 'object'` — push
an error if that's false (covers both "doesn't exist" and "exists but isn't an object,"
e.g. a union listing an enum or another union as a member).
