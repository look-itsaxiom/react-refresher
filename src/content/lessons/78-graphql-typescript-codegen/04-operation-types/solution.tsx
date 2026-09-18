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

function typeRefToTs(ref: TypeRef, leaf: (name: string) => string): string {
  if (ref.kind === 'named') {
    const base = leaf(ref.name);
    return ref.nonNull ? base : `${base} | null`;
  }
  const itemType = typeRefToTs(ref.of, leaf);
  const arr = itemType.includes('|') ? `(${itemType})[]` : `${itemType}[]`;
  return ref.nonNull ? arr : `${arr} | null`;
}

function renderFieldType(fieldNode: FieldNode, typeName: string, schema: Schema, scalars: ScalarMap): string {
  const owner = schema.types[typeName];
  if (!owner || owner.kind !== 'object') return 'unknown';
  const ref = owner.fields[fieldNode.name]!.type;
  return typeRefToTs(ref, (name) => {
    const def = schema.types[name];
    if (def?.kind === 'union' && fieldNode.inlineFragments) {
      return fieldNode.inlineFragments
        .map((frag) => renderObjectFields(frag.selectionSet, frag.onType, schema, scalars))
        .join(' | ');
    }
    if (def?.kind === 'object' && fieldNode.selectionSet) {
      return renderObjectFields(fieldNode.selectionSet, name, schema, scalars);
    }
    return scalars[name] ?? name;
  });
}

function renderObjectFields(selectionSet: FieldNode[], typeName: string, schema: Schema, scalars: ScalarMap): string {
  const lines = [`__typename: '${typeName}';`];
  for (const field of selectionSet) {
    if (field.name === '__typename') continue;
    const key = field.alias ?? field.name;
    lines.push(`${key}: ${renderFieldType(field, typeName, schema, scalars)};`);
  }
  return `{ ${lines.join(' ')} }`;
}

export function generateOperationTypes(
  document: OperationDocument,
  schema: Schema,
  name: string,
  scalars: ScalarMap = DEFAULT_SCALARS,
): string {
  const varEntries = Object.entries(document.variableDefs).map(
    ([varName, ref]) => `${varName}: ${typeRefToTs(ref, (n) => scalars[n] ?? n)};`,
  );
  const variablesType = varEntries.length ? `{ ${varEntries.join(' ')} }` : '{}';

  const rootType = document.operation === 'mutation' ? schema.mutation ?? 'Mutation' : schema.query;
  const queryType = renderObjectFields(document.selectionSet, rootType, schema, scalars);

  return `export type ${name}Variables = ${variablesType};\n\nexport type ${name}Query = ${queryType};\n`;
}

export async function persistedDocumentId(documentText: string): Promise<string> {
  const bytes = new TextEncoder().encode(documentText);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeDocument(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function buildManifest(documents: Record<string, string>): Promise<Record<string, string>> {
  const manifest: Record<string, string> = {};
  for (const text of Object.values(documents)) {
    const normalized = normalizeDocument(text);
    const id = await persistedDocumentId(normalized);
    manifest[id] = normalized;
  }
  return manifest;
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
