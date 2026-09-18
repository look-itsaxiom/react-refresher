import type { Check } from '../../../types';

type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };

type ObjectTypeDef = { fields: Record<string, { type: TypeRef }> };
type Schema = { types: Record<string, ObjectTypeDef>; query: string; mutation?: string };

type ArgValue = { kind: 'literal'; value: string | number | boolean } | { kind: 'variable'; name: string };
type FieldNode = { name: string; alias?: string; args: Record<string, ArgValue>; selectionSet?: FieldNode[] };
type OperationDocument = { operation: 'query' | 'mutation'; name?: string; selectionSet: FieldNode[] };

type Resolver = (parent: unknown, args: Record<string, unknown>, context: unknown) => unknown;
type Resolvers = Record<string, Record<string, Resolver>>;

type ExecuteInput = {
  schema: Schema;
  resolvers: Resolvers;
  document: OperationDocument;
  variables?: Record<string, unknown>;
  rootValue?: unknown;
  context?: unknown;
};
type ExecutionError = { message: string; path: (string | number)[] };
type ExecutionResult = { data: Record<string, unknown> | null; errors?: ExecutionError[] };

const named = (name: string, nonNull: boolean): TypeRef => ({ kind: 'named', name, nonNull });
const list = (of: TypeRef, nonNull: boolean): TypeRef => ({ kind: 'list', of, nonNull });

export const checks: Check[] = [
  {
    name: 'parseQuery: parses operation name, aliases, and int/string/boolean/enum/variable argument literals into a structured AST',
    run: async ({ mod, expect }) => {
      const parseQuery = mod.parseQuery as (text: string) => OperationDocument;
      const doc = parseQuery(`
        query GetStuff($limit: Int) {
          items(count: 3, label: "x", active: true, kind: FOO, max: $limit) {
            id
            title: name
          }
        }
      `);

      expect(doc.operation).to.equal('query');
      expect(doc.name).to.equal('GetStuff');
      expect(doc.selectionSet).to.have.lengthOf(1);

      const items = doc.selectionSet[0]!;
      expect(items.name).to.equal('items');
      expect(items.alias).to.equal(undefined);
      expect(items.args['count']).to.deep.equal({ kind: 'literal', value: 3 });
      expect(items.args['label']).to.deep.equal({ kind: 'literal', value: 'x' });
      expect(items.args['active']).to.deep.equal({ kind: 'literal', value: true });
      expect(items.args['kind']).to.deep.equal({ kind: 'literal', value: 'FOO' });
      expect(items.args['max']).to.deep.equal({ kind: 'variable', name: 'limit' });

      expect(items.selectionSet).to.have.lengthOf(2);
      const idField = items.selectionSet![0]!;
      expect(idField.name).to.equal('id');
      expect(idField.alias).to.equal(undefined);
      expect(idField.args).to.deep.equal({});
      expect(idField.selectionSet).to.equal(undefined);
      expect(items.selectionSet![1]!.name).to.equal('name');
      expect(items.selectionSet![1]!.alias).to.equal('title');
    },
  },
  {
    name: 'execute: resolves nested fields through both explicit and default resolvers, honoring aliases',
    run: async ({ mod, expect }) => {
      const parseQuery = mod.parseQuery as (text: string) => OperationDocument;
      const execute = mod.execute as (input: ExecuteInput) => ExecutionResult;

      const schema: Schema = {
        query: 'Query',
        types: {
          Query: { fields: { user: { type: named('User', false) } } },
          User: {
            fields: {
              id: { type: named('ID', true) },
              name: { type: named('String', true) },
              bio: { type: named('String', false) },
            },
          },
        },
      };
      const resolvers: Resolvers = {
        Query: { user: () => ({ id: '1', name: 'Ada', bio: 'Mathematician' }) },
      };

      const result = execute({
        schema,
        resolvers,
        document: parseQuery('{ user { id handle: name bio } }'),
      });

      expect(result.errors).to.equal(undefined);
      expect(result.data).to.deep.equal({ user: { id: '1', handle: 'Ada', bio: 'Mathematician' } });
    },
  },
  {
    name: 'execute: a nullable field absorbs a null from a non-null child, recording one error with the deep path',
    run: async ({ mod, expect }) => {
      const parseQuery = mod.parseQuery as (text: string) => OperationDocument;
      const execute = mod.execute as (input: ExecuteInput) => ExecutionResult;

      const schema: Schema = {
        query: 'Query',
        types: {
          Query: { fields: { user: { type: named('User', false) } } },
          User: {
            fields: {
              id: { type: named('ID', true) },
              name: { type: named('String', true) },
            },
          },
        },
      };
      const resolvers: Resolvers = {
        Query: { user: () => ({ id: '1', name: null }) },
      };

      const result = execute({ schema, resolvers, document: parseQuery('{ user { id name } }') });

      expect(result.data).to.deep.equal({ user: null });
      expect(result.errors).to.have.lengthOf(1);
      expect(result.errors![0]!.path).to.deep.equal(['user', 'name']);
    },
  },
  {
    name: 'execute: a non-null root field returning null nulls the entire response',
    run: async ({ mod, expect }) => {
      const parseQuery = mod.parseQuery as (text: string) => OperationDocument;
      const execute = mod.execute as (input: ExecuteInput) => ExecutionResult;

      const schema: Schema = {
        query: 'Query',
        types: {
          Query: { fields: { viewer: { type: named('User', true) } } },
          User: { fields: { id: { type: named('ID', true) } } },
        },
      };
      const resolvers: Resolvers = { Query: { viewer: () => null } };

      const result = execute({ schema, resolvers, document: parseQuery('{ viewer { id } }') });

      expect(result.data).to.equal(null);
      expect(result.errors).to.have.lengthOf(1);
      expect(result.errors![0]!.path).to.deep.equal(['viewer']);
    },
  },
  {
    name: 'execute: a mutation resolves its root field with args mixing a literal and a $variable, and resolves lists',
    run: async ({ mod, expect }) => {
      const parseQuery = mod.parseQuery as (text: string) => OperationDocument;
      const execute = mod.execute as (input: ExecuteInput) => ExecutionResult;

      const schema: Schema = {
        query: 'Query',
        mutation: 'Mutation',
        types: {
          Query: { fields: {} },
          Mutation: { fields: { rename: { type: named('String', true) } } },
        },
      };
      const resolvers: Resolvers = {
        Mutation: {
          rename: (_p, args) => `${(args as { id: string }).id}:${(args as { newName: string }).newName}`,
        },
      };

      const document = parseQuery('mutation Rename($id: ID!, $name: String!) { rename(id: $id, newName: $name) }');
      const result = execute({ schema, resolvers, document, variables: { id: '42', name: 'Ada 2' } });

      expect(result.errors).to.equal(undefined);
      expect(result.data).to.deep.equal({ rename: '42:Ada 2' });

      const listSchema: Schema = {
        query: 'Query',
        types: {
          Query: { fields: { tags: { type: list(named('String', true), true) } } },
        },
      };
      const listResult = execute({
        schema: listSchema,
        resolvers: { Query: { tags: () => ['a', 'b', 'c'] } },
        document: parseQuery('{ tags }'),
      });
      expect(listResult.data).to.deep.equal({ tags: ['a', 'b', 'c'] });
    },
  },
];
