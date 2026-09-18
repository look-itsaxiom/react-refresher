import type { Check } from '../../../types';

type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };
type FieldDef = { type: TypeRef };
type TypeDef =
  | { kind: 'scalar'; name: string }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'union'; name: string; members: string[] }
  | { kind: 'interface'; name: string; fields: Record<string, FieldDef> }
  | { kind: 'object'; name: string; implements: string[]; fields: Record<string, FieldDef> }
  | { kind: 'input'; name: string; fields: Record<string, FieldDef> };
type Schema = { types: Record<string, TypeDef> };
type ScalarMap = Record<string, string>;

const DEFAULT_SCALARS: ScalarMap = { ID: 'string', String: 'string', Int: 'number', Float: 'number', Boolean: 'boolean' };

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export const checks: Check[] = [
  {
    name: 'tsType: nullability, lists, and scalar mapping',
    run: async ({ mod, expect }) => {
      const tsType = mod.tsType as (ref: TypeRef, scalars: ScalarMap) => string;
      expect(tsType({ kind: 'named', name: 'ID', nonNull: true }, DEFAULT_SCALARS)).to.equal('string');
      expect(tsType({ kind: 'named', name: 'ID', nonNull: false }, DEFAULT_SCALARS)).to.equal('string | null');
      expect(tsType({ kind: 'named', name: 'Post', nonNull: true }, DEFAULT_SCALARS)).to.equal('Post');
      expect(
        tsType({ kind: 'list', nonNull: true, of: { kind: 'named', name: 'Post', nonNull: true } }, DEFAULT_SCALARS),
      ).to.equal('Post[]');
      expect(
        tsType({ kind: 'list', nonNull: false, of: { kind: 'named', name: 'Post', nonNull: true } }, DEFAULT_SCALARS),
      ).to.equal('Post[] | null');
      expect(
        tsType({ kind: 'list', nonNull: true, of: { kind: 'named', name: 'Post', nonNull: false } }, DEFAULT_SCALARS),
      ).to.equal('(Post | null)[]');
    },
  },
  {
    name: 'generateTypes: an enum becomes a string union in declaration order',
    run: async ({ mod, expect }) => {
      const generateTypes = mod.generateTypes as (schema: Schema, scalars?: ScalarMap) => string;
      const schema: Schema = { types: { Role: { kind: 'enum', name: 'Role', values: ['ADMIN', 'MEMBER'] } } };
      expect(norm(generateTypes(schema, DEFAULT_SCALARS))).to.equal(norm(`export type Role = 'ADMIN' | 'MEMBER';`));
    },
  },
  {
    name: 'generateTypes: an object gets __typename first, then fields in schema order with correct nullability',
    run: async ({ mod, expect }) => {
      const generateTypes = mod.generateTypes as (schema: Schema, scalars?: ScalarMap) => string;
      const schema: Schema = {
        types: {
          User: {
            kind: 'object',
            name: 'User',
            implements: [],
            fields: {
              id: { type: { kind: 'named', name: 'ID', nonNull: true } },
              email: { type: { kind: 'named', name: 'String', nonNull: false } },
            },
          },
        },
      };
      const expected = `
        export interface User {
          __typename: 'User';
          id: string;
          email: string | null;
        }
      `;
      expect(norm(generateTypes(schema, DEFAULT_SCALARS))).to.equal(norm(expected));
    },
  },
  {
    name: 'generateTypes: a custom scalar is resolved through the scalar map, a union references its members, and output is sorted by type name',
    run: async ({ mod, expect }) => {
      const generateTypes = mod.generateTypes as (schema: Schema, scalars?: ScalarMap) => string;
      const schema: Schema = {
        types: {
          User: {
            kind: 'object',
            name: 'User',
            implements: [],
            fields: { id: { type: { kind: 'named', name: 'ID', nonNull: true } } },
          },
          Post: {
            kind: 'object',
            name: 'Post',
            implements: [],
            fields: {
              id: { type: { kind: 'named', name: 'ID', nonNull: true } },
              publishedAt: { type: { kind: 'named', name: 'DateTime', nonNull: false } },
            },
          },
          SearchResult: { kind: 'union', name: 'SearchResult', members: ['User', 'Post'] },
        },
      };
      const scalars = { ...DEFAULT_SCALARS, DateTime: 'string' };
      const out = generateTypes(schema, scalars);

      // Sorted by name: Post, SearchResult, User.
      const postIdx = out.indexOf('interface Post');
      const searchIdx = out.indexOf('type SearchResult');
      const userIdx = out.indexOf('interface User');
      expect(postIdx).to.be.greaterThan(-1);
      expect(searchIdx).to.be.greaterThan(postIdx);
      expect(userIdx).to.be.greaterThan(searchIdx);

      expect(norm(out)).to.include(norm(`publishedAt: string | null;`));
      expect(norm(out)).to.include(norm(`export type SearchResult = User | Post;`));
      expect(out.endsWith('\n')).to.equal(true);
    },
  },
  {
    name: 'generateTypes: a scalar type declaration is never emitted on its own',
    run: async ({ mod, expect }) => {
      const generateTypes = mod.generateTypes as (schema: Schema, scalars?: ScalarMap) => string;
      const schema: Schema = {
        types: {
          DateTime: { kind: 'scalar', name: 'DateTime' },
          Query: {
            kind: 'object',
            name: 'Query',
            implements: [],
            fields: { now: { type: { kind: 'named', name: 'DateTime', nonNull: true } } },
          },
        },
      };
      const out = generateTypes(schema, { ...DEFAULT_SCALARS, DateTime: 'string' });
      expect(out).to.not.include('DateTime {');
      expect(out).to.not.include('type DateTime');
      expect(norm(out)).to.include(norm(`now: string;`));
    },
  },
];
