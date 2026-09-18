Three pure functions a real GraphQL client needs around a Relay-style connection and a
mutation payload. `App.tsx` has every type defined and `encodeCursor` fully written.
Three functions are left, all exported.

## 1. `toConnection(items, args, cursorOf)`

Turns a plain array into a `Connection<T>`, applying `first`/`after`/`last`/`before` the
way the Relay Cursor Connections spec does.

- **Validate first.** `first` and `last` set together is an error
  (`{ ok: false, error: ... }`). A negative `first` or a negative `last` is also an
  error.
- **Build all edges.** `items.map((item) => ({ cursor: encodeCursor(cursorOf(item)),
  node: item }))`.
- **Apply `after`/`before`.** If `after` is set, find the edge whose `cursor` equals it;
  if found, keep only the edges *after* that one (`slice(idx + 1)`). Same idea for
  `before`, but keep the edges *before* it (`slice(0, idx)`). If either cursor doesn't
  match anything, leave the list alone — don't error.
- **Apply `first`/`last`.** If `first` is set, keep only the first `first` edges of what
  remains, and remember whether there were more than that (that's `hasNextPage`). If
  `last` is set, keep only the last `last` edges, remembering whether there were more
  than that (that's `hasPreviousPage`).
- **Fold in the cursor bounds.** If `after` was set, `hasPreviousPage` is `true`
  (you started partway through the list). If `before` was set, `hasNextPage` is `true`.
- **Build `pageInfo`.** `startCursor`/`endCursor` are the first/last edge's `cursor`, or
  `null` if the final edge list is empty.
- Return `{ ok: true, connection: { edges, pageInfo, totalCount: items.length } }`.

## 2. `mergeConnections(existing, incoming, direction, nodeId)`

For infinite scroll: appends (`direction: 'forward'`) or prepends (`'backward'`)
`incoming`'s edges onto `existing`, deduplicating by `nodeId(edge.node)` — an edge whose
node id already appears in `existing` is dropped from `incoming` before merging, so a
page re-fetched during a refresh doesn't produce duplicate rows.

- **Forward:** result edges are `[...existing.edges, ...deduplicated incoming edges]`.
  `pageInfo.hasNextPage`/`endCursor` come from `incoming` (that's the page you just
  fetched, at the far end); `hasPreviousPage`/`startCursor` come from `existing`
  (unchanged — you didn't touch the near end).
- **Backward:** the mirror image — result edges are `[...deduplicated incoming edges,
  ...existing.edges]`; `hasPreviousPage`/`startCursor` come from `incoming`,
  `hasNextPage`/`endCursor` come from `existing`.
- `totalCount` is `incoming.totalCount` either way (the freshest count from the server).

## 3. `mutationResult(payload)`

Normalizes a GraphQL mutation's raw `{ data, errors }` envelope into one shape a UI can
branch on regardless of which error convention fired:

- If `payload.errors` is non-empty (a top-level, unexpected failure), return `{ ok:
  false, userErrors: payload.errors.map((e) => ({ message: e.message, code:
  e.extensions?.code })) }` — no `node`.
- Otherwise, if `payload.data?.result` is missing entirely, return `{ ok: false,
  userErrors: [] }`.
- Otherwise, if `payload.data.result.userErrors.length > 0` (a business-rule failure,
  errors-as-data), return `{ ok: false, userErrors: payload.data.result.userErrors }` —
  no `node`.
- Otherwise, return `{ ok: true, node: payload.data.result.node ?? undefined,
  userErrors: [] }`.
