export type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };

export type ObjectTypeDef = { fields: Record<string, { type: TypeRef }> };

export type Schema = {
  types: Record<string, ObjectTypeDef>;
  query: string;
  mutation?: string;
};

export type ArgValue = { kind: 'literal'; value: string | number | boolean } | { kind: 'variable'; name: string };

export type FieldNode = {
  name: string;
  alias?: string;
  args: Record<string, ArgValue>;
  selectionSet?: FieldNode[];
};

export type OperationDocument = {
  operation: 'query' | 'mutation';
  name?: string;
  selectionSet: FieldNode[];
};

// Splits query text into tokens: quoted strings, `$variables`, bare words (names, enum
// values, keywords), punctuation, and integers. Fully implemented.
const TOKEN_RE = /\s*("(?:[^"\\]|\\.)*"|\$\w+|[A-Za-z_]\w*|-?[0-9]+|[{}():,!])/g;
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = new RegExp(TOKEN_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) tokens.push(m[1]);
  }
  return tokens;
}

// Converts one token into an ArgValue: a `$name` is a variable reference; a quoted
// string, `true`/`false`, or an integer is a literal of the matching JS type; anything
// else (a bare word) is a literal string — that's how an enum value like `MEMBER`
// arrives, since this subset doesn't validate enum membership at parse time.
export function parseValue(tok: string): ArgValue {
  if (tok.startsWith('$')) return { kind: 'variable', name: tok.slice(1) };
  if (tok.startsWith('"')) return { kind: 'literal', value: tok.slice(1, -1) };
  if (tok === 'true' || tok === 'false') return { kind: 'literal', value: tok === 'true' };
  if (/^-?\d+$/.test(tok)) return { kind: 'literal', value: Number(tok) };
  return { kind: 'literal', value: tok };
}

// Parses `(name: value, name: value)` starting at the opening `(`. Returns the parsed
// args and the index just past the closing `)`.
export function parseArgs(tokens: string[], start: number): [Record<string, ArgValue>, number] {
  const args: Record<string, ArgValue> = {};
  let i = start + 1; // consume '('
  while (tokens[i] !== ')') {
    const argName = tokens[i]!;
    i += 2; // skip name and ':'
    args[argName] = parseValue(tokens[i]!);
    i += 1;
    if (tokens[i] === ',') i += 1;
  }
  return [args, i + 1]; // consume ')'
}

// Parses one operation document into an AST. The operation header (optional
// `query`/`mutation` keyword, optional name, optional `(...)` variable definitions,
// which this subset only skips over rather than type-checking) is fully implemented;
// it hands off to parseSelectionSet for the body.
export function parseQuery(text: string): OperationDocument {
  const tokens = tokenize(text);
  let i = 0;
  let operation: 'query' | 'mutation' = 'query';
  let name: string | undefined;

  if (tokens[i] === 'query' || tokens[i] === 'mutation') {
    operation = tokens[i] as 'query' | 'mutation';
    i += 1;
    if (tokens[i] && tokens[i] !== '{' && tokens[i] !== '(') {
      name = tokens[i];
      i += 1;
    }
    if (tokens[i] === '(') {
      let depth = 0;
      do {
        if (tokens[i] === '(') depth += 1;
        if (tokens[i] === ')') depth -= 1;
        i += 1;
      } while (depth > 0);
    }
  }

  i += 1; // consume the opening '{' of the top-level selection set
  const [selectionSet] = parseSelectionSet(tokens, i);
  return { operation, name, selectionSet };
}

// TODO: parses a `{ ... }` body (the opening '{' has already been consumed by the
// caller) into a list of FieldNodes, and returns [fields, indexJustPastClosingBrace].
//
// Loop while tokens[i] !== '}':
//   - alias detection: if tokens[i + 1] === ':', this field is aliased — alias =
//     tokens[i], name = tokens[i + 2], advance i by 3. Otherwise name = tokens[i],
//     advance i by 1.
//   - args: if tokens[i] === '(', call parseArgs(tokens, i) and set i to the returned
//     index.
//   - nested selection set: if tokens[i] === '{', recursively call
//     parseSelectionSet(tokens, i + 1) and set i to the returned index — this is what
//     lets a field like `posts { id title }` nest arbitrarily deep.
//   - push { name, alias, args, selectionSet } (args defaults to {} if there were none;
//     selectionSet stays undefined for a leaf field).
// After the loop, return [fields, i + 1] to consume the closing '}'.
export function parseSelectionSet(tokens: string[], start: number): [FieldNode[], number] {
  const fields: FieldNode[] = [];
  const i = start;
  return [fields, i];
}

export type Resolver = (parent: unknown, args: Record<string, unknown>, context: unknown) => unknown;
export type Resolvers = Record<string, Record<string, Resolver>>;

export type ExecuteInput = {
  schema: Schema;
  resolvers: Resolvers;
  document: OperationDocument;
  variables?: Record<string, unknown>;
  rootValue?: unknown;
  context?: unknown;
};

export type ExecutionError = { message: string; path: (string | number)[] };
export type ExecutionResult = { data: Record<string, unknown> | null; errors?: ExecutionError[] };

// Thrown when a non-null field resolves to null; caught by the nearest ancestor field
// whose own type is nullable, which is what "null propagation" means operationally.
class NullBubble {
  constructor(public path: (string | number)[]) {}
}

function coerceArgs(fieldNode: FieldNode, variables: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fieldNode.args)) {
    out[key] = val.kind === 'variable' ? variables[val.name] : val.value;
  }
  return out;
}

function getResolver(resolvers: Resolvers, typeName: string, fieldName: string): Resolver | undefined {
  return resolvers[typeName]?.[fieldName];
}

function defaultResolve(parent: unknown, fieldName: string): unknown {
  return parent == null ? undefined : (parent as Record<string, unknown>)[fieldName];
}

// TODO: applies a field's declared TypeRef to a raw resolver result.
//
// - If typeRef.kind === 'list': if `raw` is null/undefined, that's a violation when
//   typeRef.nonNull is true (push an ExecutionError with a message and this `path`
//   into `errors`, then `throw new NullBubble(path)`), otherwise return `null`. If
//   `raw` isn't null, `.map` over it, recursively calling completeValue with
//   `typeRef.of` and `[...path, index]` for each item.
// - Otherwise (a named type): the same null-or-throw check, but against `typeRef.nonNull`
//   directly. If `raw` isn't null and `fieldNode.selectionSet` is undefined, return
//   `raw` as-is (it's a leaf scalar/enum). If `fieldNode.selectionSet` *is* set, recurse
//   into `executeSelectionSet`, using `(raw as { __typename?: string }).__typename ??
//   typeRef.name` as the type name to look up fields against.
function completeValue(
  schema: Schema,
  resolvers: Resolvers,
  typeRef: TypeRef,
  fieldNode: FieldNode,
  raw: unknown,
  path: (string | number)[],
  variables: Record<string, unknown>,
  context: unknown,
  errors: ExecutionError[],
): unknown {
  return raw;
}

// TODO: walks one selection set. For each fieldNode in `selectionSet`:
//   - responseKey = fieldNode.alias ?? fieldNode.name; fieldPath = [...path, responseKey].
//   - if fieldNode.name === '__typename', set result[responseKey] = typeName and
//     continue (no resolver call).
//   - look up fieldDef = schema.types[typeName]?.fields[fieldNode.name]; if it's
//     missing, set result[responseKey] = null and continue.
//   - resolverFn = getResolver(resolvers, typeName, fieldNode.name); args =
//     coerceArgs(fieldNode, variables); raw = resolverFn ? resolverFn(parentValue,
//     args, context) : defaultResolve(parentValue, fieldNode.name).
//   - wrap the completeValue(...) call (same args, plus fieldDef.type and fieldPath) in
//     try/catch: on success, assign result[responseKey]; on a caught NullBubble, either
//     rethrow it (if fieldDef.type.nonNull — keep bubbling) or set result[responseKey]
//     = null (fieldDef.type is nullable — this is where the bubble stops); anything
//     that isn't a NullBubble should be rethrown unconditionally.
function executeSelectionSet(
  schema: Schema,
  resolvers: Resolvers,
  typeName: string,
  parentValue: unknown,
  selectionSet: FieldNode[],
  path: (string | number)[],
  variables: Record<string, unknown>,
  context: unknown,
  errors: ExecutionError[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  return result;
}

export function execute(input: ExecuteInput): ExecutionResult {
  const { schema, resolvers, document, variables = {}, rootValue = {}, context } = input;
  const rootTypeName = document.operation === 'mutation' ? schema.mutation ?? 'Mutation' : schema.query;
  const errors: ExecutionError[] = [];
  let data: Record<string, unknown> | null;
  try {
    data = executeSelectionSet(schema, resolvers, rootTypeName, rootValue, document.selectionSet, [], variables, context, errors);
  } catch (e) {
    if (e instanceof NullBubble) {
      data = null;
    } else {
      throw e;
    }
  }
  return errors.length > 0 ? { data, errors } : { data };
}

// --- Sample schema, dataset, and resolvers, purely to give the preview something to show.

const users: Record<string, { id: string; name: string; email: string | null }> = {
  '1': { id: '1', name: 'Ada', email: 'ada@example.com' },
  '2': { id: '2', name: 'Grace', email: null },
};

const posts = [
  { id: '10', title: 'Hello GraphQL', authorId: '1' },
  { id: '11', title: 'Resolvers 101', authorId: '1' },
];

const schema: Schema = {
  query: 'Query',
  types: {
    Query: {
      fields: {
        user: { type: { kind: 'named', name: 'User', nonNull: false } },
        users: { type: { kind: 'list', nonNull: true, of: { kind: 'named', name: 'User', nonNull: true } } },
      },
    },
    User: {
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        name: { type: { kind: 'named', name: 'String', nonNull: true } },
        email: { type: { kind: 'named', name: 'String', nonNull: false } },
        posts: { type: { kind: 'list', nonNull: true, of: { kind: 'named', name: 'Post', nonNull: true } } },
      },
    },
    Post: {
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        title: { type: { kind: 'named', name: 'String', nonNull: true } },
      },
    },
  },
};

const resolvers: Resolvers = {
  Query: {
    user: (_p, args) => users[(args as { id: string }).id] ?? null,
    users: () => Object.values(users),
  },
  User: {
    posts: (parent) => posts.filter((p) => p.authorId === (parent as { id: string }).id),
  },
};

const sampleQuery = `
  query GetUsers {
    users {
      id
      handle: name
      posts {
        id
        title
      }
    }
  }
`;

export default function App() {
  const document = parseQuery(sampleQuery);
  const result = execute({ schema, resolvers, document });
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
