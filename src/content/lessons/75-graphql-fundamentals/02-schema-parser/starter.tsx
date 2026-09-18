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

// Each regex is already anchored to one declaration kind and ready for `sdl.matchAll(...)`.
const SCALAR_RE = /scalar\s+(\w+)/g;
const ENUM_RE = /enum\s+(\w+)\s*\{([^}]*)\}/g;
const UNION_RE = /union\s+(\w+)\s*=\s*([^\n]+)/g;
const INTERFACE_RE = /interface\s+(\w+)\s*\{([^}]*)\}/g;
const TYPE_RE = /type\s+(\w+)(?:\s+implements\s+([\w\s&]+?))?\s*\{([^}]*)\}/g;
const INPUT_RE = /input\s+(\w+)\s*\{([^}]*)\}/g;

export function parseSdl(sdl: string): Schema {
  const types: Record<string, TypeDef> = {};

  // TODO: for each of the six regexes above, loop `for (const m of sdl.matchAll(RE))`
  // and add an entry to `types`, per the shapes described in prompt.md:
  //   SCALAR_RE     -> { kind: 'scalar', name }
  //   ENUM_RE       -> { kind: 'enum', name, values }            (split body on whitespace)
  //   UNION_RE      -> { kind: 'union', name, members }          (split member list on '|')
  //   INTERFACE_RE  -> { kind: 'interface', name, fields }       (parseFieldBlock the body)
  //   TYPE_RE       -> { kind: 'object', name, implements, fields } (split implements on '&')
  //   INPUT_RE      -> { kind: 'input', name, fields }           (parseFieldBlock the body)

  return { types, query: 'Query', mutation: types['Mutation'] ? 'Mutation' : undefined };
}

const BUILTIN_SCALARS = new Set(['ID', 'String', 'Int', 'Float', 'Boolean']);

export function validateSchema(schema: Schema): string[] {
  const errors: string[] = [];

  // TODO 1: if schema.types['Query'] is missing, push an error and return errors
  // immediately.

  // TODO 2: for every object/interface/input type, for every field (and every field
  // argument), find the named type with namedTypeOf(...) and push an error if it's
  // neither a key of schema.types nor one of BUILTIN_SCALARS.

  // TODO 3: for every object type's `implements` list, for every field its interface
  // declares, push an error if the object doesn't have a same-named field whose
  // namedTypeOf(...) matches the interface field's.

  // TODO 4: for every union type's `members`, push an error if a member isn't a key of
  // schema.types with kind === 'object'.

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
