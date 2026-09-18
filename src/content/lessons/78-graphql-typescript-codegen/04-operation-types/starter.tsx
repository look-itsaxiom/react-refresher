export type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };

export type FieldDef = { type: TypeRef };

export type SchemaType =
  | { kind: 'scalar'; name: string }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'union'; name: string; members: string[] }
  | { kind: 'object'; name: string; fields: Record<string, FieldDef> };

export type Schema = { types: Record<string, SchemaType>; query: string; mutation?: string };

export type ScalarMap = Record<string, string>;
export const DEFAULT_SCALARS: ScalarMap = { ID: 'string', String: 'string', Int: 'number', Float: 'number', Boolean: 'boolean' };

// One selected field in an operation's selection set. `inlineFragments` is only present
// when the field's schema type is a union, and holds one branch per concrete member the
// client asked for (`... on TypeName { ... }`).
export type FieldNode = {
  name: string;
  alias?: string;
  selectionSet?: FieldNode[];
  inlineFragments?: { onType: string; selectionSet: FieldNode[] }[];
};

export type OperationDocument = {
  operation: 'query' | 'mutation';
  variableDefs: Record<string, TypeRef>;
  selectionSet: FieldNode[];
};

// Renders a TypeRef as TypeScript, the same recursion as lesson 78's schema-codegen
// exercise, except the string for the named ref's base type is produced by `leaf`
// instead of a fixed scalar lookup — that's what lets the same wrapping logic serve both
// plain variables (leaf = scalar name) and selected fields (leaf = a nested object or
// union literal).
function typeRefToTs(ref: TypeRef, leaf: (name: string) => string): string {
  if (ref.kind === 'named') {
    const base = leaf(ref.name);
    return ref.nonNull ? base : `${base} | null`;
  }
  const itemType = typeRefToTs(ref.of, leaf);
  const arr = itemType.includes('|') ? `(${itemType})[]` : `${itemType}[]`;
  return ref.nonNull ? arr : `${arr} | null`;
}

// TODO: implement. Renders one selected field's TypeScript type (list/nullability
// already applied by typeRefToTs):
//   - Look up the field's TypeRef from `schema.types[typeName]` (an `object`)'s
//     `fields[fieldNode.name].type`.
//   - Call `typeRefToTs(ref, leaf)` where `leaf(name)`:
//       - if `schema.types[name]` is a `union` and `fieldNode.inlineFragments` is set:
//         render each fragment with `renderObjectFields(fragment.selectionSet,
//         fragment.onType, schema, scalars)` and join the results with ' | '.
//       - else if `schema.types[name]` is an `object` and `fieldNode.selectionSet` is
//         set: `renderObjectFields(fieldNode.selectionSet, name, schema, scalars)`.
//       - else (scalar or enum leaf): `scalars[name] ?? name`.
function renderFieldType(fieldNode: FieldNode, typeName: string, schema: Schema, scalars: ScalarMap): string {
  return 'unknown';
}

// TODO: implement. Renders `{ __typename: 'TypeName'; key: Type; ... }` for one
// selection set against `typeName`: always start with `__typename: 'TypeName';`, then for
// every field in `selectionSet` other than an explicit `__typename` selection, emit
// `responseKey: renderFieldType(field, typeName, schema, scalars);` where `responseKey`
// is `field.alias ?? field.name`, in selection order. Join fields with a single space and
// wrap the whole thing in `{ ... }`.
function renderObjectFields(selectionSet: FieldNode[], typeName: string, schema: Schema, scalars: ScalarMap): string {
  return '{}';
}

// TODO: implement. Produces:
//   export type ${name}Variables = { varName: Type; ... };
//
//   export type ${name}Query = { __typename: '...'; ... };
// separated by a blank line, ending with a trailing newline. `Variables` is `{}` when
// `document.variableDefs` is empty. The query's root type is `schema.mutation ??
// 'Mutation'` for a mutation operation, otherwise `schema.query`.
export function generateOperationTypes(
  document: OperationDocument,
  schema: Schema,
  name: string,
  scalars: ScalarMap = DEFAULT_SCALARS,
): string {
  return '';
}

// Computes a persisted-document id: the lowercase hex SHA-256 digest of `documentText`.
export async function persistedDocumentId(documentText: string): Promise<string> {
  // TODO: implement using crypto.subtle.digest('SHA-256', ...) over the UTF-8 bytes of
  // documentText, then hex-encode each byte of the resulting digest, zero-padded to 2
  // characters, concatenated in order.
  return '';
}

function normalizeDocument(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Builds the persisted-documents allowlist manifest: for every document text, normalize
// its whitespace, hash the normalized text, and record `{ [id]: normalizedText }`.
export async function buildManifest(documents: Record<string, string>): Promise<Record<string, string>> {
  // TODO: implement, per the doc comment above.
  return {};
}

const sampleSchema: Schema = {
  query: 'Query',
  types: {
    Query: { kind: 'object', name: 'Query', fields: { me: { type: { kind: 'named', name: 'User', nonNull: true } } } },
    User: {
      kind: 'object',
      name: 'User',
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        handle: { type: { kind: 'named', name: 'String', nonNull: true } },
      },
    },
  },
};

const sampleDocument: OperationDocument = {
  operation: 'query',
  variableDefs: {},
  selectionSet: [{ name: 'me', selectionSet: [{ name: 'id' }, { name: 'handle', alias: 'name' }] }],
};

export default function App() {
  const source = generateOperationTypes(sampleDocument, sampleSchema, 'GetMe');
  return <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{source}</pre>;
}
