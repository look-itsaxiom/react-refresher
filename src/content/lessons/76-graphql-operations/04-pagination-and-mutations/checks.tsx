import type { Check } from '../../../types';

type PageArgs = { first?: number; after?: string; last?: number; before?: string };
type Edge<T> = { cursor: string; node: T };
type PageInfo = { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
type Connection<T> = { edges: Edge<T>[]; pageInfo: PageInfo; totalCount: number };
type ConnectionResult<T> = { ok: true; connection: Connection<T> } | { ok: false; error: string };

type UserError = { message: string; code?: string; field?: string[] };
type TopLevelError = { message: string; path?: (string | number)[]; extensions?: { code?: string } };
type MutationEnvelope<TNode> = {
  data?: { result: { node: TNode | null; userErrors: UserError[] } | null } | null;
  errors?: TopLevelError[];
};
type MutationNormalized<TNode> = { ok: boolean; node?: TNode; userErrors: UserError[] };

type Item = { id: string };
const items: Item[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];

export const checks: Check[] = [
  {
    name: 'toConnection: rejects first+last together and a negative first, without touching items',
    run: async ({ mod, expect }) => {
      const toConnection = mod.toConnection as (items: Item[], args: PageArgs, cursorOf: (i: Item) => string) => ConnectionResult<Item>;

      const both = toConnection(items, { first: 1, last: 1 }, (i) => i.id);
      expect(both.ok).to.equal(false);

      const negative = toConnection(items, { first: -1 }, (i) => i.id);
      expect(negative.ok).to.equal(false);
    },
  },
  {
    name: 'toConnection: first pages forward with a correct hasNextPage/hasPreviousPage and opaque cursors',
    run: async ({ mod, expect }) => {
      const toConnection = mod.toConnection as (items: Item[], args: PageArgs, cursorOf: (i: Item) => string) => ConnectionResult<Item>;

      const page1 = toConnection(items, { first: 2 }, (i) => i.id);
      expect(page1.ok).to.equal(true);
      if (!page1.ok) return;
      expect(page1.connection.edges.map((e) => e.node.id)).to.deep.equal(['a', 'b']);
      expect(page1.connection.pageInfo.hasNextPage).to.equal(true);
      expect(page1.connection.pageInfo.hasPreviousPage).to.equal(false);
      expect(page1.connection.totalCount).to.equal(5);
      // The cursor is opaque: it must not be the raw id itself.
      expect(page1.connection.edges[0]!.cursor).to.not.equal('a');

      const cursorB = page1.connection.edges[1]!.cursor;
      const page2 = toConnection(items, { first: 2, after: cursorB }, (i) => i.id);
      expect(page2.ok).to.equal(true);
      if (!page2.ok) return;
      expect(page2.connection.edges.map((e) => e.node.id)).to.deep.equal(['c', 'd']);
      expect(page2.connection.pageInfo.hasNextPage).to.equal(true);
      expect(page2.connection.pageInfo.hasPreviousPage).to.equal(true);

      const page3 = toConnection(items, { first: 2, after: page2.connection.pageInfo.endCursor! }, (i) => i.id);
      expect(page3.ok).to.equal(true);
      if (!page3.ok) return;
      expect(page3.connection.edges.map((e) => e.node.id)).to.deep.equal(['e']);
      expect(page3.connection.pageInfo.hasNextPage).to.equal(false);
    },
  },
  {
    name: 'toConnection: last/before pages backward symmetrically',
    run: async ({ mod, expect }) => {
      const toConnection = mod.toConnection as (items: Item[], args: PageArgs, cursorOf: (i: Item) => string) => ConnectionResult<Item>;

      const lastPage = toConnection(items, { last: 2 }, (i) => i.id);
      expect(lastPage.ok).to.equal(true);
      if (!lastPage.ok) return;
      expect(lastPage.connection.edges.map((e) => e.node.id)).to.deep.equal(['d', 'e']);
      expect(lastPage.connection.pageInfo.hasPreviousPage).to.equal(true);
      expect(lastPage.connection.pageInfo.hasNextPage).to.equal(false);

      const cursorD = lastPage.connection.edges[0]!.cursor;
      const before = toConnection(items, { last: 2, before: cursorD }, (i) => i.id);
      expect(before.ok).to.equal(true);
      if (!before.ok) return;
      expect(before.connection.edges.map((e) => e.node.id)).to.deep.equal(['b', 'c']);
      expect(before.connection.pageInfo.hasNextPage).to.equal(true);
    },
  },
  {
    name: 'mergeConnections: appends forward, deduplicating by node id, keeping the far-end pageInfo from incoming',
    run: async ({ mod, expect }) => {
      const mergeConnections = mod.mergeConnections as <T>(
        existing: Connection<T>,
        incoming: Connection<T>,
        direction: 'forward' | 'backward',
        nodeId: (node: T) => string,
      ) => Connection<T>;

      const existing: Connection<Item> = {
        edges: [{ cursor: 'c-a', node: { id: 'a' } }, { cursor: 'c-b', node: { id: 'b' } }],
        pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: 'c-a', endCursor: 'c-b' },
        totalCount: 5,
      };
      // incoming re-includes 'b' (a refetch overlap) plus genuinely new 'c'.
      const incoming: Connection<Item> = {
        edges: [{ cursor: 'c-b', node: { id: 'b' } }, { cursor: 'c-c', node: { id: 'c' } }],
        pageInfo: { hasNextPage: false, hasPreviousPage: true, startCursor: 'c-b', endCursor: 'c-c' },
        totalCount: 5,
      };

      const merged = mergeConnections(existing, incoming, 'forward', (n) => n.id);
      expect(merged.edges.map((e) => e.node.id)).to.deep.equal(['a', 'b', 'c']);
      expect(merged.pageInfo.hasNextPage).to.equal(false);
      expect(merged.pageInfo.hasPreviousPage).to.equal(false);
      expect(merged.pageInfo.endCursor).to.equal('c-c');
      expect(merged.pageInfo.startCursor).to.equal('c-a');
    },
  },
  {
    name: 'mutationResult: distinguishes a top-level error, errors-as-data userErrors, and success',
    run: async ({ mod, expect }) => {
      const mutationResult = mod.mutationResult as <T>(payload: MutationEnvelope<T>) => MutationNormalized<T>;

      const transportFailure = mutationResult<{ id: string }>({
        errors: [{ message: 'upstream timed out', extensions: { code: 'UPSTREAM_TIMEOUT' } }],
      });
      expect(transportFailure.ok).to.equal(false);
      expect(transportFailure.node).to.equal(undefined);
      expect(transportFailure.userErrors).to.have.lengthOf(1);
      expect(transportFailure.userErrors[0]!.code).to.equal('UPSTREAM_TIMEOUT');

      const businessFailure = mutationResult<{ id: string }>({
        data: { result: { node: null, userErrors: [{ message: 'title is required', field: ['title'] }] } },
      });
      expect(businessFailure.ok).to.equal(false);
      expect(businessFailure.node).to.equal(undefined);
      expect(businessFailure.userErrors).to.have.lengthOf(1);
      expect(businessFailure.userErrors[0]!.message).to.equal('title is required');

      const success = mutationResult<{ id: string }>({
        data: { result: { node: { id: '42' }, userErrors: [] } },
      });
      expect(success.ok).to.equal(true);
      expect(success.node).to.deep.equal({ id: '42' });
      expect(success.userErrors).to.have.lengthOf(0);
    },
  },
];
