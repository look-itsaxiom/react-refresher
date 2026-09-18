import type { Check } from '../../../types';

type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };
type FieldDef = { type: TypeRef };
type SchemaType =
  | { kind: 'scalar'; name: string }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'union'; name: string; members: string[] }
  | { kind: 'object'; name: string; fields: Record<string, FieldDef> };
type Schema = { types: Record<string, SchemaType>; query: string; mutation?: string };
type ScalarMap = Record<string, string>;
type FieldNode = {
  name: string;
  alias?: string;
  selectionSet?: FieldNode[];
  inlineFragments?: { onType: string; selectionSet: FieldNode[] }[];
};
type OperationDocument = { operation: 'query' | 'mutation'; variableDefs: Record<string, TypeRef>; selectionSet: FieldNode[] };

const SCALARS: ScalarMap = { ID: 'string', String: 'string', Int: 'number', Float: 'number', Boolean: 'boolean' };

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const schema: Schema = {
  query: 'Query',
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      fields: {
        user: { type: { kind: 'named', name: 'User', nonNull: true } },
        search: { type: { kind: 'list', nonNull: true, of: { kind: 'named', name: 'SearchResult', nonNull: true } } },
      },
    },
    User: {
      kind: 'object',
      name: 'User',
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        name: { type: { kind: 'named', name: 'String', nonNull: true } },
      },
    },
    Post: {
      kind: 'object',
      name: 'Post',
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        title: { type: { kind: 'named', name: 'String', nonNull: true } },
      },
    },
    SearchResult: { kind: 'union', name: 'SearchResult', members: ['User', 'Post'] },
  },
};

export const checks: Check[] = [
  {
    name: 'generateOperationTypes: an aliased scalar field renders under its alias, with __typename and no variables',
    run: async ({ mod, expect }) => {
      const generateOperationTypes = mod.generateOperationTypes as (
        doc: OperationDocument,
        schema: Schema,
        name: string,
        scalars?: ScalarMap,
      ) => string;
      const document: OperationDocument = {
        operation: 'query',
        variableDefs: {},
        selectionSet: [{ name: 'user', selectionSet: [{ name: 'id' }, { name: 'name', alias: 'handle' }] }],
      };
      const out = generateOperationTypes(document, schema, 'GetUser', SCALARS);
      const expected = `
        export type GetUserVariables = {};
        export type GetUserQuery = { __typename: 'Query'; user: { __typename: 'User'; id: string; handle: string; }; };
      `;
      expect(norm(out)).to.equal(norm(expected));
      expect(out.endsWith('\n')).to.equal(true);
    },
  },
  {
    name: 'generateOperationTypes: variables render in declaration order with correct nullability',
    run: async ({ mod, expect }) => {
      const generateOperationTypes = mod.generateOperationTypes as (
        doc: OperationDocument,
        schema: Schema,
        name: string,
        scalars?: ScalarMap,
      ) => string;
      const document: OperationDocument = {
        operation: 'query',
        variableDefs: {
          id: { kind: 'named', name: 'ID', nonNull: true },
          includeArchived: { kind: 'named', name: 'Boolean', nonNull: false },
        },
        selectionSet: [{ name: 'user', selectionSet: [{ name: 'id' }] }],
      };
      const out = generateOperationTypes(document, schema, 'GetUser', SCALARS);
      expect(norm(out)).to.include(norm(`export type GetUserVariables = { id: string; includeArchived: boolean | null; };`));
    },
  },
  {
    name: 'generateOperationTypes: a union field with inline fragments becomes a discriminated union, each member narrowable by __typename',
    run: async ({ mod, expect }) => {
      const generateOperationTypes = mod.generateOperationTypes as (
        doc: OperationDocument,
        schema: Schema,
        name: string,
        scalars?: ScalarMap,
      ) => string;
      const document: OperationDocument = {
        operation: 'query',
        variableDefs: {},
        selectionSet: [
          {
            name: 'search',
            inlineFragments: [
              { onType: 'User', selectionSet: [{ name: 'id' }, { name: 'name' }] },
              { onType: 'Post', selectionSet: [{ name: 'id' }, { name: 'title' }] },
            ],
          },
        ],
      };
      const out = generateOperationTypes(document, schema, 'Search', SCALARS);
      const expected = `
        export type SearchVariables = {};
        export type SearchQuery = { __typename: 'Query'; search: ({ __typename: 'User'; id: string; name: string; } | { __typename: 'Post'; id: string; title: string; })[]; };
      `;
      expect(norm(out)).to.equal(norm(expected));
    },
  },
  {
    name: 'generateOperationTypes: a mutation root uses schema.mutation',
    run: async ({ mod, expect }) => {
      const generateOperationTypes = mod.generateOperationTypes as (
        doc: OperationDocument,
        schema: Schema,
        name: string,
        scalars?: ScalarMap,
      ) => string;
      const mutationSchema: Schema = {
        query: 'Query',
        mutation: 'Mutation',
        types: {
          ...schema.types,
          Mutation: { kind: 'object', name: 'Mutation', fields: { createUser: { type: { kind: 'named', name: 'User', nonNull: true } } } },
        },
      };
      const document: OperationDocument = {
        operation: 'mutation',
        variableDefs: {},
        selectionSet: [{ name: 'createUser', selectionSet: [{ name: 'id' }] }],
      };
      const out = generateOperationTypes(document, mutationSchema, 'CreateUser', SCALARS);
      expect(norm(out)).to.include(norm(`__typename: 'Mutation'; createUser: { __typename: 'User'; id: string; };`));
    },
  },
  {
    name: 'persistedDocumentId: returns a stable 64-character lowercase hex SHA-256 digest',
    run: async ({ mod, expect }) => {
      const persistedDocumentId = mod.persistedDocumentId as (text: string) => Promise<string>;
      const idA = await persistedDocumentId('query GetUser { user { id } }');
      const idB = await persistedDocumentId('query GetUser { user { id } }');
      const idC = await persistedDocumentId('query GetUser { user { id name } }');
      expect(idA).to.equal(idB);
      expect(idA).to.not.equal(idC);
      expect(idA).to.match(/^[0-9a-f]{64}$/);
    },
  },
  {
    name: 'buildManifest: normalizes whitespace before hashing and keys the result by document id',
    run: async ({ mod, expect }) => {
      const buildManifest = mod.buildManifest as (docs: Record<string, string>) => Promise<Record<string, string>>;
      const persistedDocumentId = mod.persistedDocumentId as (text: string) => Promise<string>;

      const manifest = await buildManifest({
        GetUser: 'query GetUser {\n  user {   id\n  }\n}',
      });
      const ids = Object.keys(manifest);
      expect(ids).to.have.lengthOf(1);

      const normalized = 'query GetUser { user { id } }';
      const expectedId = await persistedDocumentId(normalized);
      expect(ids[0]).to.equal(expectedId);
      expect(manifest[expectedId!]).to.equal(normalized);
    },
  },
];
