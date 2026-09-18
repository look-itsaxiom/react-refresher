type FieldType = 'string' | 'number' | 'boolean';
type Schema = Record<string, FieldType>;

type OperatorsFor<F extends FieldType> = F extends 'number'
  ? { eq?: number; gt?: number; lt?: number }
  : F extends 'string'
    ? { eq?: string; contains?: string }
    : { eq?: boolean };

type Filters<S extends Schema> = {
  [K in keyof S]?: OperatorsFor<S[K]>;
};

function buildQuery<S extends Schema>(_schema: S, filters: Filters<S>): string {
  const parts: string[] = [];
  for (const field in filters) {
    const ops = filters[field];
    if (!ops) continue;
    for (const op in ops) {
      const value = (ops as Record<string, unknown>)[op];
      if (value === undefined) continue;
      parts.push(`${field}.${op}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

const schema = {
  age: 'number',
  name: 'string',
  active: 'boolean',
} satisfies Schema;

const filters = {
  age: { gt: 3 },
  name: { contains: 'an' },
} satisfies Filters<typeof schema>;

const query = buildQuery(schema, filters);

// --- type-level tests: the sandbox strips types before running your code, so these lines
// are graded by `pnpm typecheck`, not by the preview. ---
const badNumberFilter: Filters<typeof schema> = {
  // @ts-expect-error 'contains' is a string operator; 'age' is typed 'number' in the schema
  age: { contains: 'x' },
};
void badNumberFilter;

const badStringFilter: Filters<typeof schema> = {
  // @ts-expect-error 'gt' is a number operator; 'name' is typed 'string' in the schema
  name: { gt: 3 },
};
void badStringFilter;

export default function App() {
  return (
    <main>
      <p data-testid="query">{query}</p>
    </main>
  );
}

export { buildQuery };
export type { Schema, FieldType, OperatorsFor, Filters };
