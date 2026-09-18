import type { Check } from '../../../types';

type TypeRef = { kind: 'named'; name: string; nonNull: boolean } | { kind: 'list'; of: TypeRef; nonNull: boolean };
type Schema = { types: Record<string, { fields: Record<string, { type: TypeRef }> }>; query: string; mutation?: string };
type ArgValue = { kind: 'literal'; value: string | number | boolean } | { kind: 'variable'; name: string };
type FieldNode = { name: string; alias?: string; args: Record<string, ArgValue>; selectionSet?: FieldNode[] };
type OperationDocument = { operation: 'query' | 'mutation'; name?: string; selectionSet: FieldNode[] };
type QueryCostOptions = { fieldWeights?: Record<string, number>; listMultiplier?: number; maxDepth: number; maxCost: number };
type QueryCostResult = { depth: number; cost: number; allowed: boolean; reasons: string[] };

type ApiRequirements = {
  consumers: 'internal-single-team' | 'internal-multi-team' | 'public-third-party';
  clientDiversity: 'single-typescript-app' | 'multiple-typescript-apps' | 'heterogeneous';
  domainShape: 'flat-resources' | 'graph-shaped';
  needsCdnCaching: boolean;
  monorepo: boolean;
};
type ApiChoice = { style: 'rest' | 'graphql' | 'trpc'; reasons: string[] };

type Mod = {
  queryCost: (document: OperationDocument, schema: Schema, options: QueryCostOptions) => QueryCostResult;
  chooseApiStyle: (requirements: ApiRequirements) => ApiChoice;
};

const named = (name: string, nonNull = true): TypeRef => ({ kind: 'named', name, nonNull });
const list = (of: TypeRef, nonNull = true): TypeRef => ({ kind: 'list', of, nonNull });

const schema: Schema = {
  query: 'Query',
  types: {
    Query: { fields: { users: { type: list(named('User')) } } },
    User: {
      fields: {
        id: { type: named('ID') },
        name: { type: named('String') },
        posts: { type: list(named('Post')) },
      },
    },
    Post: {
      fields: {
        id: { type: named('ID') },
        comments: { type: list(named('Comment')) },
      },
    },
    Comment: { fields: { id: { type: named('ID') } } },
  },
};

const flatQuery: OperationDocument = {
  operation: 'query',
  selectionSet: [
    { name: 'users', args: {}, selectionSet: [{ name: 'id', args: {} }, { name: 'name', args: {} }] },
  ],
};

const aliasedNestedQuery: OperationDocument = {
  operation: 'query',
  selectionSet: [
    {
      name: 'users',
      alias: 'a',
      args: {},
      selectionSet: [
        { name: 'id', args: {} },
        {
          name: 'posts',
          args: { first: { kind: 'literal', value: 5 } },
          selectionSet: [
            { name: 'id', args: {} },
            {
              name: 'comments',
              args: { first: { kind: 'literal', value: 3 } },
              selectionSet: [{ name: 'id', args: {} }],
            },
          ],
        },
      ],
    },
    { name: 'users', alias: 'b', args: {}, selectionSet: [{ name: 'id', args: {} }] },
  ],
};

export const checks: Check[] = [
  {
    name: 'a flat query costs weight(1) + listMultiplier(10) * two leaf children, depth 2, allowed under a generous budget',
    run: async ({ mod, expect }) => {
      const { queryCost } = mod as unknown as Mod;
      const result = queryCost(flatQuery, schema, { maxDepth: 5, maxCost: 100 });
      expect(result.depth).to.equal(2);
      expect(result.cost).to.equal(21);
      expect(result.allowed).to.equal(true);
      expect(result.reasons).to.deep.equal([]);
    },
  },
  {
    name: 'a maxCost just below the computed cost flips allowed to false and reports a cost reason',
    run: async ({ mod, expect }) => {
      const { queryCost } = mod as unknown as Mod;
      const result = queryCost(flatQuery, schema, { maxDepth: 5, maxCost: 20 });
      expect(result.cost).to.equal(21);
      expect(result.allowed).to.equal(false);
      expect(result.reasons.some((r) => /cost/i.test(r) && r.includes('21'))).to.equal(true);
    },
  },
  {
    name: 'aliased fields are costed separately: two aliases of a deeply-nested field roughly double the total vs. one',
    run: async ({ mod, expect }) => {
      const { queryCost } = mod as unknown as Mod;
      const result = queryCost(aliasedNestedQuery, schema, { maxDepth: 10, maxCost: 1000 });
      expect(result.depth).to.equal(4);
      expect(result.cost).to.equal(282);
    },
  },
  {
    name: 'depth over the limit is reported as a depth reason even when cost is within budget',
    run: async ({ mod, expect }) => {
      const { queryCost } = mod as unknown as Mod;
      const result = queryCost(aliasedNestedQuery, schema, { maxDepth: 3, maxCost: 1000 });
      expect(result.allowed).to.equal(false);
      expect(result.reasons.some((r) => /depth/i.test(r) && r.includes('4'))).to.equal(true);
      expect(result.reasons.some((r) => /cost/i.test(r))).to.equal(false);
    },
  },
  {
    name: 'list arguments (first/limit) override the default listMultiplier for that field only',
    run: async ({ mod, expect }) => {
      const { queryCost } = mod as unknown as Mod;
      const withDefaultMultiplier = queryCost(aliasedNestedQuery, schema, { maxDepth: 10, maxCost: 100000, listMultiplier: 2 });
      // Only the outer `users` calls (no `first` arg) use the overridden multiplier of 2;
      // `posts(first: 5)` and `comments(first: 3)` still use their explicit arguments.
      expect(withDefaultMultiplier.cost).to.be.lessThan(282);
    },
  },
  {
    name: 'public third-party consumers rule out tRPC even when the monorepo flag is also true',
    run: async ({ mod, expect }) => {
      const { chooseApiStyle } = mod as unknown as Mod;
      const choice = chooseApiStyle({
        consumers: 'public-third-party',
        clientDiversity: 'multiple-typescript-apps',
        domainShape: 'flat-resources',
        needsCdnCaching: false,
        monorepo: true,
      });
      expect(choice.style).to.not.equal('trpc');
      expect(choice.style).to.equal('rest');
      expect(choice.reasons.length).to.be.greaterThan(0);
    },
  },
  {
    name: 'heterogeneous clients over a graph-shaped domain choose GraphQL',
    run: async ({ mod, expect }) => {
      const { chooseApiStyle } = mod as unknown as Mod;
      const choice = chooseApiStyle({
        consumers: 'internal-multi-team',
        clientDiversity: 'heterogeneous',
        domainShape: 'graph-shaped',
        needsCdnCaching: false,
        monorepo: false,
      });
      expect(choice.style).to.equal('graphql');
    },
  },
  {
    name: 'a single TypeScript monorepo with no public consumers chooses tRPC',
    run: async ({ mod, expect }) => {
      const { chooseApiStyle } = mod as unknown as Mod;
      const choice = chooseApiStyle({
        consumers: 'internal-single-team',
        clientDiversity: 'single-typescript-app',
        domainShape: 'flat-resources',
        needsCdnCaching: false,
        monorepo: true,
      });
      expect(choice.style).to.equal('trpc');
    },
  },
  {
    name: 'CDN-cacheable public reads with no monorepo and no graph-shaped fan-out choose REST',
    run: async ({ mod, expect }) => {
      const { chooseApiStyle } = mod as unknown as Mod;
      const choice = chooseApiStyle({
        consumers: 'public-third-party',
        clientDiversity: 'heterogeneous',
        domainShape: 'flat-resources',
        needsCdnCaching: true,
        monorepo: false,
      });
      expect(choice.style).to.equal('rest');
    },
  },
];
