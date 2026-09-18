export type PageArgs = { first?: number; after?: string; last?: number; before?: string };
export type Edge<T> = { cursor: string; node: T };
export type PageInfo = { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
export type Connection<T> = { edges: Edge<T>[]; pageInfo: PageInfo; totalCount: number };
export type ConnectionResult<T> = { ok: true; connection: Connection<T> } | { ok: false; error: string };

// Encodes a raw id into an opaque cursor. Fully implemented.
export function encodeCursor(raw: string): string {
  return btoa(raw);
}

// TODO: builds a Connection<T> from `items`, applying Relay-style first/after/last/before
// pagination (see prompt.md for the full spec).
export function toConnection<T>(items: T[], args: PageArgs, cursorOf: (item: T) => string): ConnectionResult<T> {
  return {
    ok: true,
    connection: {
      edges: items.map((item) => ({ cursor: encodeCursor(cursorOf(item)), node: item })),
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      totalCount: items.length,
    },
  };
}

// TODO: merges `incoming` into `existing` for infinite scroll, deduplicating by
// `nodeId(edge.node)` (see prompt.md for the full spec, forward vs backward).
export function mergeConnections<T>(
  existing: Connection<T>,
  incoming: Connection<T>,
  direction: 'forward' | 'backward',
  nodeId: (node: T) => string,
): Connection<T> {
  return existing;
}

export type TopLevelError = { message: string; path?: (string | number)[]; extensions?: { code?: string } };
export type UserError = { message: string; code?: string; field?: string[] };

export type MutationEnvelope<TNode> = {
  data?: { result: { node: TNode | null; userErrors: UserError[] } | null } | null;
  errors?: TopLevelError[];
};

export type MutationNormalized<TNode> = { ok: boolean; node?: TNode; userErrors: UserError[] };

// TODO: normalizes a mutation envelope into { ok, node?, userErrors } (see prompt.md for
// the full spec: top-level errors, a missing result, errors-as-data via userErrors, or
// success).
export function mutationResult<TNode>(payload: MutationEnvelope<TNode>): MutationNormalized<TNode> {
  return { ok: true, userErrors: [] };
}

// --- Sample data, purely to give the preview something to show.

type Post = { id: string; title: string };
const posts: Post[] = [
  { id: '1', title: 'Hello GraphQL' },
  { id: '2', title: 'Resolvers 101' },
  { id: '3', title: 'Fragments and colocation' },
];

export default function App() {
  const page = toConnection(posts, { first: 2 }, (p) => p.id);
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(page, null, 2)}
    </pre>
  );
}
