// --- Same AST shape as lesson 75's query executor; no parsing needed, documents below
// are already built as plain objects.

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

export type QueryCostOptions = {
  fieldWeights?: Record<string, number>;
  listMultiplier?: number;
  maxDepth: number;
  maxCost: number;
};

export type QueryCostResult = { depth: number; cost: number; allowed: boolean; reasons: string[] };

function namedTypeName(typeRef: TypeRef): string {
  return typeRef.kind === 'named' ? typeRef.name : namedTypeName(typeRef.of);
}

// TODO: cost one field node against the type it's selected from. See prompt.md for the
// exact weight/multiplier/childCost formula. This stub ignores weights, list
// multipliers, and children entirely — replace it.
function fieldCost(
  schema: Schema,
  typeName: string,
  field: FieldNode,
  weights: Record<string, number>,
  listMultiplier: number,
): number {
  return weights[`${typeName}.${field.name}`] ?? 1;
}

// TODO: the number of nested selection-set levels. This stub always returns 1.
function depthOf(fields: FieldNode[]): number {
  return fields.length === 0 ? 0 : 1;
}

export function queryCost(document: OperationDocument, schema: Schema, options: QueryCostOptions): QueryCostResult {
  const weights = options.fieldWeights ?? {};
  const listMultiplier = options.listMultiplier ?? 10;
  const rootType = document.operation === 'mutation' ? (schema.mutation ?? schema.query) : schema.query;

  const cost = document.selectionSet.reduce(
    (sum, field) => sum + fieldCost(schema, rootType, field, weights, listMultiplier),
    0,
  );
  const depth = depthOf(document.selectionSet);

  const reasons: string[] = [];
  if (depth > options.maxDepth) reasons.push(`depth ${depth} exceeds maxDepth ${options.maxDepth}`);
  if (cost > options.maxCost) reasons.push(`cost ${cost} exceeds maxCost ${options.maxCost}`);

  return { depth, cost, allowed: reasons.length === 0, reasons };
}

export type ApiRequirements = {
  consumers: 'internal-single-team' | 'internal-multi-team' | 'public-third-party';
  clientDiversity: 'single-typescript-app' | 'multiple-typescript-apps' | 'heterogeneous';
  domainShape: 'flat-resources' | 'graph-shaped';
  needsCdnCaching: boolean;
  monorepo: boolean;
};

export type ApiStyle = 'rest' | 'graphql' | 'trpc';
export type ApiChoice = { style: ApiStyle; reasons: string[] };

// TODO: implement the scoring rules from prompt.md. This stub always says REST.
export function chooseApiStyle(requirements: ApiRequirements): ApiChoice {
  return { style: 'rest', reasons: ['REST is the safest default for an unspecified shape.'] };
}

// --- Sample schema and query, purely to give the preview something to show.

const sampleSchema: Schema = {
  query: 'Query',
  types: {
    Query: {
      fields: {
        users: { type: { kind: 'list', nonNull: true, of: { kind: 'named', name: 'User', nonNull: true } } },
      },
    },
    User: {
      fields: {
        id: { type: { kind: 'named', name: 'ID', nonNull: true } },
        name: { type: { kind: 'named', name: 'String', nonNull: true } },
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

const sampleDocument: OperationDocument = {
  operation: 'query',
  selectionSet: [
    {
      name: 'users',
      args: {},
      selectionSet: [
        { name: 'id', args: {} },
        { name: 'name', args: {} },
        {
          name: 'posts',
          args: { first: { kind: 'literal', value: 5 } },
          selectionSet: [{ name: 'id', args: {} }],
        },
      ],
    },
  ],
};

export default function App() {
  const result = queryCost(sampleDocument, sampleSchema, { maxDepth: 5, maxCost: 100 });
  const choice = chooseApiStyle({
    consumers: 'internal-multi-team',
    clientDiversity: 'heterogeneous',
    domainShape: 'graph-shaped',
    needsCdnCaching: false,
    monorepo: false,
  });
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify({ result, choice }, null, 2)}
    </pre>
  );
}
