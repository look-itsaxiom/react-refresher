export type PageArgs = { first?: number; after?: string; last?: number; before?: string };
export type Edge<T> = { cursor: string; node: T };
export type PageInfo = { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
export type Connection<T> = { edges: Edge<T>[]; pageInfo: PageInfo; totalCount: number };
export type ConnectionResult<T> = { ok: true; connection: Connection<T> } | { ok: false; error: string };

// Encodes a raw id into an opaque cursor. Fully implemented.
export function encodeCursor(raw: string): string {
  return btoa(raw);
}

export function toConnection<T>(items: T[], args: PageArgs, cursorOf: (item: T) => string): ConnectionResult<T> {
  const { first, after, last, before } = args;
  if (first !== undefined && last !== undefined) {
    return { ok: false, error: 'first and last cannot both be set' };
  }
  if (first !== undefined && first < 0) {
    return { ok: false, error: 'first must not be negative' };
  }
  if (last !== undefined && last < 0) {
    return { ok: false, error: 'last must not be negative' };
  }

  let edges: Edge<T>[] = items.map((item) => ({ cursor: encodeCursor(cursorOf(item)), node: item }));

  if (after !== undefined) {
    const idx = edges.findIndex((e) => e.cursor === after);
    if (idx !== -1) edges = edges.slice(idx + 1);
  }
  if (before !== undefined) {
    const idx = edges.findIndex((e) => e.cursor === before);
    if (idx !== -1) edges = edges.slice(0, idx);
  }

  let hasNextPage = false;
  let hasPreviousPage = false;

  if (first !== undefined) {
    hasNextPage = edges.length > first;
    edges = edges.slice(0, first);
  }
  if (last !== undefined) {
    hasPreviousPage = edges.length > last;
    edges = edges.slice(Math.max(0, edges.length - last));
  }
  if (after !== undefined) hasPreviousPage = true;
  if (before !== undefined) hasNextPage = true;

  return {
    ok: true,
    connection: {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: edges.length > 0 ? edges[0]!.cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1]!.cursor : null,
      },
      totalCount: items.length,
    },
  };
}

export function mergeConnections<T>(
  existing: Connection<T>,
  incoming: Connection<T>,
  direction: 'forward' | 'backward',
  nodeId: (node: T) => string,
): Connection<T> {
  const existingIds = new Set(existing.edges.map((e) => nodeId(e.node)));
  const newEdges = incoming.edges.filter((e) => !existingIds.has(nodeId(e.node)));

  if (direction === 'forward') {
    return {
      edges: [...existing.edges, ...newEdges],
      pageInfo: {
        hasNextPage: incoming.pageInfo.hasNextPage,
        hasPreviousPage: existing.pageInfo.hasPreviousPage,
        startCursor: existing.pageInfo.startCursor,
        endCursor: incoming.pageInfo.endCursor,
      },
      totalCount: incoming.totalCount,
    };
  }

  return {
    edges: [...newEdges, ...existing.edges],
    pageInfo: {
      hasNextPage: existing.pageInfo.hasNextPage,
      hasPreviousPage: incoming.pageInfo.hasPreviousPage,
      startCursor: incoming.pageInfo.startCursor,
      endCursor: existing.pageInfo.endCursor,
    },
    totalCount: incoming.totalCount,
  };
}

export type TopLevelError = { message: string; path?: (string | number)[]; extensions?: { code?: string } };
export type UserError = { message: string; code?: string; field?: string[] };

export type MutationEnvelope<TNode> = {
  data?: { result: { node: TNode | null; userErrors: UserError[] } | null } | null;
  errors?: TopLevelError[];
};

export type MutationNormalized<TNode> = { ok: boolean; node?: TNode; userErrors: UserError[] };

export function mutationResult<TNode>(payload: MutationEnvelope<TNode>): MutationNormalized<TNode> {
  if (payload.errors && payload.errors.length > 0) {
    return {
      ok: false,
      userErrors: payload.errors.map((e) => ({ message: e.message, code: e.extensions?.code })),
    };
  }

  const result = payload.data?.result;
  if (!result) {
    return { ok: false, userErrors: [] };
  }

  if (result.userErrors.length > 0) {
    return { ok: false, userErrors: result.userErrors };
  }

  return { ok: true, node: result.node ?? undefined, userErrors: [] };
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
