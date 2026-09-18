export type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };

export type FieldDef = { type: TypeRef };

export type TypeDef =
  | { kind: 'scalar'; name: string }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'union'; name: string; members: string[] }
  | { kind: 'interface'; name: string; fields: Record<string, FieldDef> }
  | { kind: 'object'; name: string; implements: string[]; fields: Record<string, FieldDef> }
  | { kind: 'input'; name: string; fields: Record<string, FieldDef> };

export type Schema = { types: Record<string, TypeDef> };

export type ScalarMap = Record<string, string>;

export const DEFAULT_SCALARS: ScalarMap = {
  ID: 'string',
  String: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
};

// Renders one TypeRef as TypeScript source: nullability as `| null`, lists as arrays,
// scalars resolved through `scalars` (falling back to the bare name for a type defined
// in the schema, e.g. an object, interface, input, enum, or union).
//
// tsType({ kind: 'named', name: 'ID', nonNull: true }, scalars)        -> 'string'
// tsType({ kind: 'named', name: 'ID', nonNull: false }, scalars)       -> 'string | null'
// tsType({ kind: 'list', nonNull: true, of: { kind:'named', name:'Post', nonNull:true } }, scalars)
//   -> 'Post[]'
export function tsType(ref: TypeRef, scalars: ScalarMap): string {
  // TODO: implement, per the doc comment above.
  return 'unknown';
}

// Generates TypeScript source text for the whole schema:
//   - `scalar` types are not emitted as their own declaration (they're only used via
//     `scalars` wherever they're referenced).
//   - `enum` -> `export type Name = 'A' | 'B';` (values in schema order).
//   - `interface` and `input` -> `export interface Name { field: Type; ... }` (fields in
//     schema order, one per line, each `fieldName: tsType(fieldDef.type, scalars);`).
//   - `object` -> same as interface/input, but with `__typename: 'Name';` as the first
//     field, always, so union members can be narrowed by it.
//   - `union` -> `export type Name = Member1 | Member2;` (members in schema order),
//     referencing the object types emitted above (each of which already carries its own
//     `__typename` literal).
//   - The declarations are joined with a single blank line between them, sorted by type
//     name (ascending, plain string comparison), and the whole result ends with a
//     trailing newline.
export function generateTypes(schema: Schema, scalars: ScalarMap = DEFAULT_SCALARS): string {
  // TODO: implement, per the doc comment above.
  return '';
}

const sampleSchema: Schema = {
  types: {
    Role: { kind: 'enum', name: 'Role', values: ['ADMIN', 'MEMBER'] },
    User: {
      kind: 'object',
      name: 'User',
      implements: [],
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        name: { type: { kind: 'named', name: 'String', nonNull: true } },
        role: { type: { kind: 'named', name: 'Role', nonNull: true } },
        posts: {
          type: {
            kind: 'list',
            nonNull: true,
            of: { kind: 'named', name: 'Post', nonNull: true },
          },
        },
      },
    },
    Post: {
      kind: 'object',
      name: 'Post',
      implements: [],
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        title: { type: { kind: 'named', name: 'String', nonNull: true } },
        publishedAt: { type: { kind: 'named', name: 'DateTime', nonNull: false } },
      },
    },
    SearchResult: { kind: 'union', name: 'SearchResult', members: ['User', 'Post'] },
  },
};

export default function App() {
  const source = generateTypes(sampleSchema, { ...DEFAULT_SCALARS, DateTime: 'string' });
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{source}</pre>
  );
}
