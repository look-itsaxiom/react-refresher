A `buildQuery` for a schema-typed filter object, with two pieces missing: the type that
makes bad filters uncompilable, and the function that turns good filters into a string.

## 1. `OperatorsFor<F>`

`Filters<S>` maps each field in the schema to `OperatorsFor<S[K]>` — the set of operators
legal for that field's type. The stub, `Record<string, unknown>`, accepts anything, which
is why `{ age: { contains: 'x' } }` currently doesn't error even though `age` is a
`'number'` field with no `contains` operator. Make `OperatorsFor<F extends FieldType>`
conditional on `F`:

```ts
type OperatorsFor<F extends FieldType> = F extends 'number'
  ? { eq?: number; gt?: number; lt?: number }
  : F extends 'string'
    ? { eq?: string; contains?: string }
    : { eq?: boolean };
```

## 2. `buildQuery`

Implement the body: for every field present in `filters`, for every operator present on
that field's filter object, produce one `"field.op=value"` piece (the value URL-encoded
with `encodeURIComponent`). Skip a field with no filter at all, and skip an operator whose
value is `undefined`. Join all pieces with `&`. `{ age: { gt: 3 }, name: { contains: 'an' } }`
against the schema below should produce two pieces, in either order:
`age.gt=3` and `name.contains=an`.

```ts
const schema = { age: 'number', name: 'string', active: 'boolean' } satisfies Schema;
```

## Type-level tests

Once `OperatorsFor` is correct, add two type-level tests below the working query (the
solution has them; the starter doesn't, because they'd currently fail to even compile as
"unused directives" against the wide stub):

```ts
const badNumberFilter: Filters<typeof schema> = {
  // @ts-expect-error 'contains' is a string operator; 'age' is typed 'number' in the schema
  age: { contains: 'x' },
};
```

`@ts-expect-error` is itself a test: it only passes when the line below it *does* fail to
type-check. The sandbox preview strips types before running your code, so this never runs
there — it's graded the same way `pnpm typecheck` grades every solution in this repo, by a
real type-checker refusing to compile a line that should be illegal.
