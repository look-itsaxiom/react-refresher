Two independent, pure functions in this exercise: a static query-cost analyzer (the
depth/complexity defense from the concept step) and a small decision function that
scores REST vs. GraphQL vs. tRPC from a requirements object.

`App.tsx` gives you the AST types (the same `FieldNode`/`OperationDocument`/`Schema`
shape you built a parser and executor for in lesson 75 — no parsing needed here, the
documents are already built for you), the requirements types, and a default `App`.
`queryCost` and `chooseApiStyle` are left for you.

## 1. `queryCost(document, schema, options)`

```ts
type QueryCostOptions = {
  fieldWeights?: Record<string, number>; // key: "TypeName.fieldName", default weight 1
  listMultiplier?: number; // default 10
  maxDepth: number;
  maxCost: number;
};
type QueryCostResult = { depth: number; cost: number; allowed: boolean; reasons: string[] };
```

Compute, without touching any real data:

- **Depth**: the number of nested selection-set levels. A query with only top-level
  scalar fields has depth `1`; each level of nesting under a field adds `1`.
- **Cost of one field node**, given the GraphQL type name it's selected against:
  - `weight = fieldWeights['TypeName.fieldName'] ?? 1`.
  - Look up the field's declared type in the schema. If it's a list type (at the
    outermost level — `TypeRef.kind === 'list'`): `multiplier` is the field's `first` or
    `limit` argument if present as a literal number, otherwise `listMultiplier` (default
    `10`). If it's not a list, the multiplier is `1`.
  - `childCost` = the sum of the cost of every field in this field's `selectionSet`
    (`0` if there is none), evaluated against the field's named child type.
  - `cost = weight + multiplier * childCost`.
  - A field the schema doesn't recognize costs `1` and contributes no children (you
    can't know its shape).
- **Total cost**: the sum of the cost of every top-level field in `document`'s
  selection set, rooted at `schema.query` (or `schema.mutation` when
  `document.operation === 'mutation'`).
- **Aliases are separate selections.** `{ a: expensiveField b: expensiveField }` is two
  `FieldNode`s in the array — walk the array as given and each contributes its own cost;
  don't merge same-named fields.
- `allowed = depth <= options.maxDepth && cost <= options.maxCost`.
- `reasons`: `[]` when `allowed`. Otherwise one string per violated limit, e.g. `` `depth
  6 exceeds maxDepth 5` `` and/or `` `cost 340 exceeds maxCost 200` ``.

## 2. `chooseApiStyle(requirements)`

```ts
type ApiRequirements = {
  consumers: 'internal-single-team' | 'internal-multi-team' | 'public-third-party';
  clientDiversity: 'single-typescript-app' | 'multiple-typescript-apps' | 'heterogeneous';
  domainShape: 'flat-resources' | 'graph-shaped';
  needsCdnCaching: boolean;
  monorepo: boolean;
};
type ApiChoice = { style: 'rest' | 'graphql' | 'trpc'; reasons: string[] };
```

Score all three styles starting at `0`, apply these rules in order, and return the
highest-scoring style with a non-empty `reasons` array explaining every rule that fired
(the exact wording is yours):

1. `consumers === 'public-third-party'` → `trpc` is **disqualified** (its score can
   never win, regardless of any other rule) and `rest` gets `+2`.
2. `clientDiversity === 'heterogeneous' && domainShape === 'graph-shaped'` → `graphql`
   gets `+3`.
3. `monorepo === true` **and tRPC isn't disqualified** → `trpc` gets `+3`.
4. `needsCdnCaching === true` → `rest` gets `+2`.

Pick the highest score; on a tie prefer `rest`, then `graphql`, then `trpc`. If no rule
fired at all, return `rest` with a reason saying so — it's the safest default for an
unspecified shape.
