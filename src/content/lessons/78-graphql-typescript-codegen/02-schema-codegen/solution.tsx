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

export function tsType(ref: TypeRef, scalars: ScalarMap): string {
  if (ref.kind === 'named') {
    const base = scalars[ref.name] ?? ref.name;
    return ref.nonNull ? base : `${base} | null`;
  }
  const itemType = tsType(ref.of, scalars);
  const arr = itemType.includes('|') ? `(${itemType})[]` : `${itemType}[]`;
  return ref.nonNull ? arr : `${arr} | null`;
}

function renderFields(fields: Record<string, FieldDef>, scalars: ScalarMap): string {
  return Object.entries(fields)
    .map(([name, def]) => `  ${name}: ${tsType(def.type, scalars)};`)
    .join('\n');
}

export function generateTypes(schema: Schema, scalars: ScalarMap = DEFAULT_SCALARS): string {
  const blocks: { name: string; text: string }[] = [];

  for (const typeDef of Object.values(schema.types)) {
    if (typeDef.kind === 'scalar') continue;

    if (typeDef.kind === 'enum') {
      const values = typeDef.values.map((v) => `'${v}'`).join(' | ');
      blocks.push({ name: typeDef.name, text: `export type ${typeDef.name} = ${values};` });
      continue;
    }

    if (typeDef.kind === 'union') {
      blocks.push({ name: typeDef.name, text: `export type ${typeDef.name} = ${typeDef.members.join(' | ')};` });
      continue;
    }

    if (typeDef.kind === 'interface' || typeDef.kind === 'input') {
      const body = renderFields(typeDef.fields, scalars);
      blocks.push({
        name: typeDef.name,
        text: `export interface ${typeDef.name} {\n${body}\n}`,
      });
      continue;
    }

    // object
    const body = [`  __typename: '${typeDef.name}';`, renderFields(typeDef.fields, scalars)]
      .filter(Boolean)
      .join('\n');
    blocks.push({ name: typeDef.name, text: `export interface ${typeDef.name} {\n${body}\n}` });
  }

  blocks.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return blocks.map((b) => b.text).join('\n\n') + '\n';
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
