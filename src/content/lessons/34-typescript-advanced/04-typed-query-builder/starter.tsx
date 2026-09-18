type FieldType = 'string' | 'number' | 'boolean';
type Schema = Record<string, FieldType>;

// TODO: this stub allows any operator on any field. Make it conditional on `F`: a 'number'
// field should only accept { eq?, gt?, lt? } (all numbers), a 'string' field only
// { eq?, contains? } (all strings), and 'boolean' only { eq? } (boolean). See the prompt
// for how the solution's type-level tests grade this.
type OperatorsFor<F extends FieldType> = Record<string, unknown>;

type Filters<S extends Schema> = {
  [K in keyof S]?: OperatorsFor<S[K]>;
};

// TODO: implement. For every field present in `filters`, for every operator present on
// that field's filter object, push a `"field.op=value"` piece (URL-encode the value).
// Skip fields with no filter and operators with an `undefined` value. Join pieces with '&'.
function buildQuery<S extends Schema>(_schema: S, filters: Filters<S>): string {
  return '';
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

export default function App() {
  return (
    <main>
      <p data-testid="query">{query}</p>
    </main>
  );
}

export { buildQuery };
export type { Schema, FieldType, OperatorsFor, Filters };
