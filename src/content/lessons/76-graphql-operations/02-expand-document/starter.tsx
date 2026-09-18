export type ArgValue = { kind: 'literal'; value: string | number | boolean } | { kind: 'variable'; name: string };

export type Directive = { name: 'include' | 'skip'; if: ArgValue };

export type FieldSelection = {
  kind: 'field';
  name: string;
  alias?: string;
  args?: Record<string, ArgValue>;
  directives?: Directive[];
  selectionSet?: Selection[];
};

export type FragmentSpreadSelection = {
  kind: 'fragmentSpread';
  name: string;
  directives?: Directive[];
};

export type InlineFragmentSelection = {
  kind: 'inlineFragment';
  typeCondition?: string;
  directives?: Directive[];
  selectionSet: Selection[];
};

export type Selection = FieldSelection | FragmentSpreadSelection | InlineFragmentSelection;

export type FragmentDefinition = {
  name: string;
  typeCondition: string;
  selectionSet: Selection[];
};

export type VariableDefinition = {
  name: string;
  required: boolean;
  defaultValue?: string | number | boolean;
};

export type OperationDocument = {
  operation: 'query' | 'mutation';
  name?: string;
  variableDefinitions?: VariableDefinition[];
  selectionSet: Selection[];
};

export type ExpandedField = {
  name: string;
  alias?: string;
  args: Record<string, unknown>;
  typeCondition?: string;
  selectionSet?: ExpandedField[];
};

export type ExpandOptions = {
  variables?: Record<string, unknown>;
  fragments?: Record<string, FragmentDefinition>;
};

export type ExpandResult = { ok: true; selectionSet: ExpandedField[] } | { ok: false; error: string };

// Resolves each arg to its concrete value: a `$variable` reference reads from
// `variables`, a literal passes through as-is. Fully implemented.
export function resolveArgs(args: Record<string, ArgValue> | undefined, variables: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(args ?? {})) {
    out[key] = val.kind === 'variable' ? variables[val.name] : val.value;
  }
  return out;
}

function directiveValue(directive: Directive, variables: Record<string, unknown>): boolean {
  return directive.if.kind === 'variable' ? Boolean(variables[directive.if.name]) : Boolean(directive.if.value);
}

// Decides whether a selection carrying these directives should be dropped. `@skip`
// takes precedence over `@include` when both are present. Fully implemented.
export function isSkipped(directives: Directive[] | undefined, variables: Record<string, unknown>): boolean {
  if (!directives) return false;
  const skip = directives.find((d) => d.name === 'skip');
  if (skip && directiveValue(skip, variables)) return true;
  const include = directives.find((d) => d.name === 'include');
  if (include && !directiveValue(include, variables)) return true;
  return false;
}

function resolveVariables(
  definitions: VariableDefinition[] | undefined,
  provided: Record<string, unknown>,
): { ok: true; variables: Record<string, unknown> } | { ok: false; error: string } {
  const variables: Record<string, unknown> = { ...provided };
  for (const def of definitions ?? []) {
    if (variables[def.name] === undefined) {
      if (def.defaultValue !== undefined) variables[def.name] = def.defaultValue;
      else if (def.required) return { ok: false, error: `Missing required variable "$${def.name}"` };
    }
  }
  return { ok: true, variables };
}

// TODO: mutates `target` in place, adding `field` to it (see prompt.md for the full
// spec). A match is an existing entry with the same `(alias ?? name)` whose
// `typeCondition` is compatible with `field`'s (equal, or either one `undefined`);
// when both the match and `field` have a `selectionSet`, merge `field.selectionSet`'s
// entries into the match's `selectionSet` (recursively, via `mergeField` again);
// otherwise, with no match, push `field` onto `target`.
export function mergeField(target: ExpandedField[], field: ExpandedField): void {
  target.push(field);
}

// TODO: walks `selections` into a flat, merged ExpandedField[] (see prompt.md for the
// full spec, kind by kind: 'field', 'fragmentSpread', 'inlineFragment'). Return
// { ok: false, error } for an unknown fragment or a cyclic fragment spread; otherwise
// { ok: true, selectionSet }.
export function expandSelections(
  selections: Selection[],
  variables: Record<string, unknown>,
  fragments: Record<string, FragmentDefinition>,
  typeCondition: string | undefined,
  fragmentPath: string[],
): ExpandResult {
  return { ok: true, selectionSet: [] };
}

export function expandDocument(doc: OperationDocument, options: ExpandOptions = {}): ExpandResult {
  const resolved = resolveVariables(doc.variableDefinitions, options.variables ?? {});
  if (!resolved.ok) return resolved;
  return expandSelections(doc.selectionSet, resolved.variables, options.fragments ?? {}, undefined, []);
}

// --- Sample document, purely to give the preview something to show.

const fragments: Record<string, FragmentDefinition> = {
  UserCard: {
    name: 'UserCard',
    typeCondition: 'User',
    selectionSet: [
      { kind: 'field', name: 'id', args: {} },
      { kind: 'field', name: 'name', args: {} },
    ],
  },
};

const sampleDoc: OperationDocument = {
  operation: 'query',
  name: 'GetUser',
  variableDefinitions: [{ name: 'withEmail', required: true }],
  selectionSet: [
    {
      kind: 'field',
      name: 'user',
      args: { id: { kind: 'literal', value: '1' } },
      selectionSet: [
        { kind: 'fragmentSpread', name: 'UserCard' },
        { kind: 'field', name: 'email', args: {}, directives: [{ name: 'include', if: { kind: 'variable', name: 'withEmail' } }] },
      ],
    },
  ],
};

export default function App() {
  const result = expandDocument(sampleDoc, { variables: { withEmail: true }, fragments });
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
