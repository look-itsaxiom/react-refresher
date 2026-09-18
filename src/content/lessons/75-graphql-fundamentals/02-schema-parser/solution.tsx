export type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };

export type FieldDef = {
  type: TypeRef;
  args: Record<string, TypeRef>;
  deprecated?: string;
};

export type TypeDef =
  | { kind: 'scalar'; name: string }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'union'; name: string; members: string[] }
  | { kind: 'interface'; name: string; fields: Record<string, FieldDef> }
  | { kind: 'object'; name: string; implements: string[]; fields: Record<string, FieldDef> }
  | { kind: 'input'; name: string; fields: Record<string, FieldDef> };

export type Schema = { types: Record<string, TypeDef>; query: string; mutation?: string };

// Recursively unwraps `[...]` and trailing `!` into a structured TypeRef.
// parseTypeRef('[Post!]!') -> { kind: 'list', nonNull: true, of: { kind: 'named', name: 'Post', nonNull: true } }
export function parseTypeRef(raw: string): TypeRef {
  const s = raw.trim();
  if (s.startsWith('[')) {
    const close = s.lastIndexOf(']');
    const inner = s.slice(1, close);
    const after = s.slice(close + 1);
    return { kind: 'list', of: parseTypeRef(inner), nonNull: after.startsWith('!') };
  }
  const nonNull = s.endsWith('!');
  return { kind: 'named', name: nonNull ? s.slice(0, -1) : s, nonNull };
}

// Walks a (possibly list-wrapped) TypeRef down to the name at its core.
export function namedTypeOf(ref: TypeRef): string {
  return ref.kind === 'named' ? ref.name : namedTypeOf(ref.of);
}

// Matches one field line, e.g. `posts(limit: Int): [Post!]!` or
// `status: String! @deprecated(reason: "use state instead")`.
// Groups: 1 name, 2 raw arg list (or undefined), 3 type, 4 deprecation reason (or undefined).
const FIELD_LINE_RE =
  /^(\w+)\s*(?:\(([^)]*)\))?\s*:\s*(\S+)(?:\s*@deprecated(?:\(reason:\s*"([^"]*)"\))?)?\s*$/;

// Turns a `{ ... }` body into a field map. Fully implemented — call it, don't rewrite it.
export function parseFieldBlock(body: string): Record<string, FieldDef> {
  const fields: Record<string, FieldDef> = {};
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = FIELD_LINE_RE.exec(line);
    if (!m) continue;
    const [, name, argsRaw, typeRaw, reason] = m;
    const args: Record<string, TypeRef> = {};
    if (argsRaw) {
      for (const argPart of argsRaw.split(',')) {
        const argMatch = argPart.trim().match(/^(\w+)\s*:\s*(\S+)$/);
        if (argMatch) args[argMatch[1]!] = parseTypeRef(argMatch[2]!);
      }
    }
    fields[name!] = {
      type: parseTypeRef(typeRaw!),
      args,
      ...(reason !== undefined ? { deprecated: reason } : {}),
    };
  }
  return fields;
}

const SCALAR_RE = /scalar\s+(\w+)/g;
const ENUM_RE = /enum\s+(\w+)\s*\{([^}]*)\}/g;
const UNION_RE = /union\s+(\w+)\s*=\s*([^\n]+)/g;
const INTERFACE_RE = /interface\s+(\w+)\s*\{([^}]*)\}/g;
const TYPE_RE = /type\s+(\w+)(?:\s+implements\s+([\w\s&]+?))?\s*\{([^}]*)\}/g;
const INPUT_RE = /input\s+(\w+)\s*\{([^}]*)\}/g;

export function parseSdl(sdl: string): Schema {
  const types: Record<string, TypeDef> = {};

  for (const m of sdl.matchAll(SCALAR_RE)) {
    types[m[1]!] = { kind: 'scalar', name: m[1]! };
  }

  for (const m of sdl.matchAll(ENUM_RE)) {
    const values = m[2]!.split(/\s+/).filter(Boolean);
    types[m[1]!] = { kind: 'enum', name: m[1]!, values };
  }

  for (const m of sdl.matchAll(UNION_RE)) {
    const members = m[2]!.split('|').map((s) => s.trim()).filter(Boolean);
    types[m[1]!] = { kind: 'union', name: m[1]!, members };
  }

  for (const m of sdl.matchAll(INTERFACE_RE)) {
    types[m[1]!] = { kind: 'interface', name: m[1]!, fields: parseFieldBlock(m[2]!) };
  }

  for (const m of sdl.matchAll(TYPE_RE)) {
    const implementsList = m[2] ? m[2].split('&').map((s) => s.trim()).filter(Boolean) : [];
    types[m[1]!] = { kind: 'object', name: m[1]!, implements: implementsList, fields: parseFieldBlock(m[3]!) };
  }

  for (const m of sdl.matchAll(INPUT_RE)) {
    types[m[1]!] = { kind: 'input', name: m[1]!, fields: parseFieldBlock(m[2]!) };
  }

  return { types, query: 'Query', mutation: types['Mutation'] ? 'Mutation' : undefined };
}

const BUILTIN_SCALARS = new Set(['ID', 'String', 'Int', 'Float', 'Boolean']);

export function validateSchema(schema: Schema): string[] {
  const errors: string[] = [];

  if (!schema.types['Query']) {
    errors.push('Schema has no Query type');
    return errors;
  }

  function checkTypeRef(ownerName: string, fieldName: string, ref: TypeRef, argName?: string): void {
    const name = namedTypeOf(ref);
    if (!schema.types[name] && !BUILTIN_SCALARS.has(name)) {
      errors.push(
        argName
          ? `${ownerName}.${fieldName}(${argName}:) references unknown type "${name}"`
          : `${ownerName}.${fieldName} references unknown type "${name}"`,
      );
    }
  }

  for (const typeDef of Object.values(schema.types)) {
    if (typeDef.kind !== 'object' && typeDef.kind !== 'interface' && typeDef.kind !== 'input') continue;
    for (const [fieldName, fieldDef] of Object.entries(typeDef.fields)) {
      checkTypeRef(typeDef.name, fieldName, fieldDef.type);
      for (const [argName, argType] of Object.entries(fieldDef.args)) {
        checkTypeRef(typeDef.name, fieldName, argType, argName);
      }
    }
  }

  for (const typeDef of Object.values(schema.types)) {
    if (typeDef.kind !== 'object') continue;
    for (const interfaceName of typeDef.implements) {
      const interfaceDef = schema.types[interfaceName];
      if (!interfaceDef || interfaceDef.kind !== 'interface') continue;
      for (const [fieldName, interfaceField] of Object.entries(interfaceDef.fields)) {
        const objectField = typeDef.fields[fieldName];
        if (!objectField || namedTypeOf(objectField.type) !== namedTypeOf(interfaceField.type)) {
          errors.push(`${typeDef.name} implements ${interfaceName} but is missing field "${fieldName}"`);
        }
      }
    }
  }

  for (const typeDef of Object.values(schema.types)) {
    if (typeDef.kind !== 'union') continue;
    for (const member of typeDef.members) {
      const memberDef = schema.types[member];
      if (!memberDef || memberDef.kind !== 'object') {
        errors.push(`Union ${typeDef.name} has non-object member "${member}"`);
      }
    }
  }

  return errors;
}

function SchemaReport({ schema, errors }: { schema: Schema; errors: string[] }) {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Types ({Object.keys(schema.types).length})</h2>
      <ul>
        {Object.values(schema.types).map((t) => (
          <li key={t.name}>
            {t.name} — {t.kind}
          </li>
        ))}
      </ul>
      <h2>Validation errors</h2>
      {errors.length === 0 ? (
        <p>(none)</p>
      ) : (
        <ul>
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const sampleSdl = `
scalar DateTime

enum Role {
  ADMIN
  MEMBER
}

interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
  email: String
  role: Role!
  posts(limit: Int): [Post!]!
}

type Post implements Node {
  id: ID!
  title: String!
  author: User!
  publishedAt: DateTime
  status: String! @deprecated(reason: "use state instead")
}

union SearchResult = User | Post

input UserFilter {
  role: Role
  nameContains: String
}

type Query {
  user(id: ID!): User
  users(filter: UserFilter): [User!]!
  search(term: String!): [SearchResult!]!
}
`;

export default function App() {
  const schema = parseSdl(sampleSdl);
  const errors = validateSchema(schema);
  return <SchemaReport schema={schema} errors={errors} />;
}
