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

// Parses a `{ ... }` body (the opening '{' has already been consumed by the caller)
// into a list of FieldNodes, recursing into nested selection sets. Returns the fields
// and the index just past the closing '}'.
export function parseSelectionSet(tokens: string[], start: number): [FieldNode[], number] {
  const fields: FieldNode[] = [];
  let i = start;
  while (tokens[i] !== '}') {
    let alias: string | undefined;
    let name: string;
    if (tokens[i + 1] === ':') {
      alias = tokens[i]!;
      name = tokens[i + 2]!;
      i += 3;
    } else {
      name = tokens[i]!;
      i += 1;
    }

    let args: Record<string, ArgValue> = {};
    if (tokens[i] === '(') {
      const [parsedArgs, next] = parseArgs(tokens, i);
      args = parsedArgs;
      i = next;
    }

    let selectionSet: FieldNode[] | undefined;
    if (tokens[i] === '{') {
      const [nested, next] = parseSelectionSet(tokens, i + 1);
      selectionSet = nested;
      i = next;
    }

    fields.push({ name, alias, args, selectionSet });
  }
  return [fields, i + 1]; // consume '}'
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

// Applies a field's declared TypeRef to a raw resolver result: enforces non-null
// (throwing NullBubble on violation), maps over lists recursively, and — for a raw
// value that's an object with more selections to make — recurses back into
// executeSelectionSet using the response value's own object type.
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
  if (typeRef.kind === 'list') {
    if (raw == null) {
      if (typeRef.nonNull) {
        errors.push({ message: `Cannot return null for non-nullable field "${fieldNode.name}"`, path });
        throw new NullBubble(path);
      }
      return null;
    }
    return (raw as unknown[]).map((item, index) =>
      completeValue(schema, resolvers, typeRef.of, fieldNode, item, [...path, index], variables, context, errors),
    );
  }

  if (raw == null) {
    if (typeRef.nonNull) {
      errors.push({ message: `Cannot return null for non-nullable field "${fieldNode.name}"`, path });
      throw new NullBubble(path);
    }
    return null;
  }

  if (!fieldNode.selectionSet) return raw;

  const objectTypeName = (raw as { __typename?: string }).__typename ?? typeRef.name;
  return executeSelectionSet(
    schema,
    resolvers,
    objectTypeName,
    raw,
    fieldNode.selectionSet,
    path,
    variables,
    context,
    errors,
  );
}

// Walks one selection set: for each field, resolves it (a registered resolver, or the
// default property-access resolver), then hands the raw result to completeValue. If a
// child field's NullBubble reaches here and this field's own type is non-null, it keeps
// propagating; otherwise this field absorbs it and becomes null.
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
  for (const fieldNode of selectionSet) {
    const responseKey = fieldNode.alias ?? fieldNode.name;
    const fieldPath = [...path, responseKey];

    if (fieldNode.name === '__typename') {
      result[responseKey] = typeName;
      continue;
    }

    const fieldDef = schema.types[typeName]?.fields[fieldNode.name];
    if (!fieldDef) {
      result[responseKey] = null;
      continue;
    }

    const resolverFn = getResolver(resolvers, typeName, fieldNode.name);
    const args = coerceArgs(fieldNode, variables);
    const raw = resolverFn ? resolverFn(parentValue, args, context) : defaultResolve(parentValue, fieldNode.name);

    try {
      result[responseKey] = completeValue(
        schema,
        resolvers,
        fieldDef.type,
        fieldNode,
        raw,
        fieldPath,
        variables,
        context,
        errors,
      );
    } catch (e) {
      if (e instanceof NullBubble) {
        if (fieldDef.type.nonNull) throw e;
        result[responseKey] = null;
      } else {
        throw e;
      }
    }
  }
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
