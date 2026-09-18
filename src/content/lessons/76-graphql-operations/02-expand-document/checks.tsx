import type { Check } from '../../../types';

type ArgValue = { kind: 'literal'; value: string | number | boolean } | { kind: 'variable'; name: string };
type Directive = { name: 'include' | 'skip'; if: ArgValue };

type Selection =
  | { kind: 'field'; name: string; alias?: string; args?: Record<string, ArgValue>; directives?: Directive[]; selectionSet?: Selection[] }
  | { kind: 'fragmentSpread'; name: string; directives?: Directive[] }
  | { kind: 'inlineFragment'; typeCondition?: string; directives?: Directive[]; selectionSet: Selection[] };

type FragmentDefinition = { name: string; typeCondition: string; selectionSet: Selection[] };
type VariableDefinition = { name: string; required: boolean; defaultValue?: string | number | boolean };
type OperationDocument = {
  operation: 'query' | 'mutation';
  name?: string;
  variableDefinitions?: VariableDefinition[];
  selectionSet: Selection[];
};

type ExpandedField = {
  name: string;
  alias?: string;
  args: Record<string, unknown>;
  typeCondition?: string;
  selectionSet?: ExpandedField[];
};
type ExpandOptions = { variables?: Record<string, unknown>; fragments?: Record<string, FragmentDefinition> };
type ExpandResult = { ok: true; selectionSet: ExpandedField[] } | { ok: false; error: string };

export const checks: Check[] = [
  {
    name: 'expandDocument: expands a fragment spread and merges a duplicate field selected directly alongside it',
    run: async ({ mod, expect }) => {
      const expandDocument = mod.expandDocument as (doc: OperationDocument, options?: ExpandOptions) => ExpandResult;

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
      const doc: OperationDocument = {
        operation: 'query',
        selectionSet: [
          {
            kind: 'field',
            name: 'user',
            args: {},
            selectionSet: [
              { kind: 'fragmentSpread', name: 'UserCard' },
              { kind: 'field', name: 'id', args: {} },
              { kind: 'field', name: 'email', args: {} },
            ],
          },
        ],
      };

      const result = expandDocument(doc, { fragments });
      expect(result.ok).to.equal(true);
      if (!result.ok) return;

      expect(result.selectionSet).to.have.lengthOf(1);
      const user = result.selectionSet[0]!;
      expect(user.name).to.equal('user');
      expect(user.selectionSet).to.have.lengthOf(3);
      expect(user.selectionSet!.map((f) => f.name)).to.deep.equal(['id', 'name', 'email']);
    },
  },
  {
    name: 'expandDocument: drops a field behind @include(if: $var) when false, and behind a literal @skip(if: true) unconditionally',
    run: async ({ mod, expect }) => {
      const expandDocument = mod.expandDocument as (doc: OperationDocument, options?: ExpandOptions) => ExpandResult;

      const doc: OperationDocument = {
        operation: 'query',
        variableDefinitions: [{ name: 'withEmail', required: true }],
        selectionSet: [
          {
            kind: 'field',
            name: 'user',
            args: {},
            selectionSet: [
              {
                kind: 'field',
                name: 'email',
                args: {},
                directives: [{ name: 'include', if: { kind: 'variable', name: 'withEmail' } }],
              },
              {
                kind: 'field',
                name: 'phone',
                args: {},
                directives: [{ name: 'skip', if: { kind: 'literal', value: true } }],
              },
            ],
          },
        ],
      };

      const withoutEmail = expandDocument(doc, { variables: { withEmail: false } });
      expect(withoutEmail.ok).to.equal(true);
      if (withoutEmail.ok) {
        expect(withoutEmail.selectionSet[0]!.selectionSet).to.have.lengthOf(0);
      }

      const withEmail = expandDocument(doc, { variables: { withEmail: true } });
      expect(withEmail.ok).to.equal(true);
      if (withEmail.ok) {
        const fields = withEmail.selectionSet[0]!.selectionSet!;
        expect(fields).to.have.lengthOf(1);
        expect(fields[0]!.name).to.equal('email');
      }
    },
  },
  {
    name: 'expandDocument: a missing required variable with no default is an error, not a thrown exception',
    run: async ({ mod, expect }) => {
      const expandDocument = mod.expandDocument as (doc: OperationDocument, options?: ExpandOptions) => ExpandResult;

      const doc: OperationDocument = {
        operation: 'query',
        variableDefinitions: [{ name: 'userId', required: true }],
        selectionSet: [{ kind: 'field', name: 'user', args: { id: { kind: 'variable', name: 'userId' } } }],
      };

      const result = expandDocument(doc, { variables: {} });
      expect(result.ok).to.equal(false);
      if (!result.ok) {
        expect(result.error).to.be.a('string').and.not.empty;
      }
    },
  },
  {
    name: 'expandDocument: two inline fragments on a union keep same-named fields separate when their type conditions differ',
    run: async ({ mod, expect }) => {
      const expandDocument = mod.expandDocument as (doc: OperationDocument, options?: ExpandOptions) => ExpandResult;

      const doc: OperationDocument = {
        operation: 'query',
        selectionSet: [
          {
            kind: 'field',
            name: 'search',
            args: {},
            selectionSet: [
              {
                kind: 'inlineFragment',
                typeCondition: 'User',
                selectionSet: [
                  { kind: 'field', name: 'id', args: {} },
                  { kind: 'field', name: 'name', args: {} },
                ],
              },
              {
                kind: 'inlineFragment',
                typeCondition: 'Post',
                selectionSet: [
                  { kind: 'field', name: 'id', args: {} },
                  { kind: 'field', name: 'title', args: {} },
                ],
              },
            ],
          },
        ],
      };

      const result = expandDocument(doc, {});
      expect(result.ok).to.equal(true);
      if (!result.ok) return;

      const fields = result.selectionSet[0]!.selectionSet!;
      const idFields = fields.filter((f) => f.name === 'id');
      expect(idFields).to.have.lengthOf(2);
      expect(idFields.map((f) => f.typeCondition).sort()).to.deep.equal(['Post', 'User']);
      expect(fields.some((f) => f.name === 'name' && f.typeCondition === 'User')).to.equal(true);
      expect(fields.some((f) => f.name === 'title' && f.typeCondition === 'Post')).to.equal(true);
    },
  },
  {
    name: 'expandDocument: two fragments spreading each other is a cyclic-fragment error, not infinite recursion',
    run: async ({ mod, expect }) => {
      const expandDocument = mod.expandDocument as (doc: OperationDocument, options?: ExpandOptions) => ExpandResult;

      const fragments: Record<string, FragmentDefinition> = {
        A: { name: 'A', typeCondition: 'X', selectionSet: [{ kind: 'fragmentSpread', name: 'B' }] },
        B: { name: 'B', typeCondition: 'X', selectionSet: [{ kind: 'fragmentSpread', name: 'A' }] },
      };
      const doc: OperationDocument = {
        operation: 'query',
        selectionSet: [{ kind: 'fragmentSpread', name: 'A' }],
      };

      const result = expandDocument(doc, { fragments });
      expect(result.ok).to.equal(false);
      if (!result.ok) {
        expect(result.error.toLowerCase()).to.include('cyclic');
      }
    },
  },
];
