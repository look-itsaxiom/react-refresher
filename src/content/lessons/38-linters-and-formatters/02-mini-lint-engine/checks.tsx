import type { Check } from '../../../types';

type LintNode = any;
type Diagnostic = { ruleId: string; message: string; line: number };

export const checks: Check[] = [
  {
    name: 'lint: flags a hook call nested inside an IfStatement as "rules-of-hooks", at the call\'s own line',
    run: async ({ mod, expect }) => {
      const lint = mod.lint as (ast: LintNode, rules: unknown[]) => Diagnostic[];
      const rulesOfHooksRule = mod.rulesOfHooksRule;

      const ast: LintNode = {
        type: 'Program',
        line: 1,
        body: [
          {
            type: 'FunctionDeclaration',
            name: 'Widget',
            line: 2,
            body: [
              {
                type: 'IfStatement',
                line: 3,
                consequent: [{ type: 'CallExpression', callee: { name: 'useEffect' }, line: 5 }],
              },
            ],
          },
        ],
      };

      const diagnostics = lint(ast, [rulesOfHooksRule]);
      const hits = diagnostics.filter((d) => d.ruleId === 'rules-of-hooks');
      expect(hits).to.have.lengthOf(1);
      expect(hits[0]!.line).to.equal(5);
      expect(hits[0]!.message.toLowerCase()).to.include('condition');
    },
  },
  {
    name: 'lint: flags a hook call after an earlier sibling ReturnStatement, but not one before the return',
    run: async ({ mod, expect }) => {
      const lint = mod.lint as (ast: LintNode, rules: unknown[]) => Diagnostic[];
      const rulesOfHooksRule = mod.rulesOfHooksRule;

      const ast: LintNode = {
        type: 'Program',
        line: 1,
        body: [
          {
            type: 'FunctionDeclaration',
            name: 'Widget',
            line: 2,
            body: [
              { type: 'CallExpression', callee: { name: 'useEarly' }, line: 3 },
              { type: 'ReturnStatement', line: 4 },
              { type: 'CallExpression', callee: { name: 'useLate' }, line: 5 },
            ],
          },
        ],
      };

      const diagnostics = lint(ast, [rulesOfHooksRule]);
      const hits = diagnostics.filter((d) => d.ruleId === 'rules-of-hooks');
      expect(hits).to.have.lengthOf(1);
      expect(hits[0]!.line).to.equal(5);
      expect(hits.some((d) => d.line === 3)).to.equal(false);
    },
  },
  {
    name: 'lint: a call whose name does not start with "use" is never flagged by rules-of-hooks, even inside a conditional',
    run: async ({ mod, expect }) => {
      const lint = mod.lint as (ast: LintNode, rules: unknown[]) => Diagnostic[];
      const rulesOfHooksRule = mod.rulesOfHooksRule;

      const ast: LintNode = {
        type: 'Program',
        line: 1,
        body: [
          {
            type: 'FunctionDeclaration',
            name: 'Widget',
            line: 2,
            body: [
              {
                type: 'IfStatement',
                line: 3,
                consequent: [{ type: 'CallExpression', callee: { name: 'formatDate' }, line: 4 }],
              },
            ],
          },
        ],
      };

      const diagnostics = lint(ast, [rulesOfHooksRule]);
      expect(diagnostics).to.have.lengthOf(0);
    },
  },
  {
    name: 'lint: no-unused-vars flags a declaration never referenced by an Identifier, and does not flag one that is',
    run: async ({ mod, expect }) => {
      const lint = mod.lint as (ast: LintNode, rules: unknown[]) => Diagnostic[];
      const noUnusedVarsRule = mod.noUnusedVarsRule;

      const ast: LintNode = {
        type: 'Program',
        line: 1,
        body: [
          {
            type: 'FunctionDeclaration',
            name: 'Widget',
            line: 2,
            body: [
              { type: 'VariableDeclaration', name: 'used', line: 3 },
              { type: 'Identifier', name: 'used', line: 4 },
              { type: 'VariableDeclaration', name: 'dead', line: 5 },
            ],
          },
        ],
      };

      const diagnostics = lint(ast, [noUnusedVarsRule]);
      expect(diagnostics).to.have.lengthOf(1);
      expect(diagnostics[0]!.ruleId).to.equal('no-unused-vars');
      expect(diagnostics[0]!.line).to.equal(5);
      expect(diagnostics[0]!.message).to.include('dead');
    },
  },
  {
    name: 'lint: an Identifier that references a name declared in a different FunctionDeclaration still counts as a use (usage is tree-wide, not scoped)',
    run: async ({ mod, expect }) => {
      const lint = mod.lint as (ast: LintNode, rules: unknown[]) => Diagnostic[];
      const noUnusedVarsRule = mod.noUnusedVarsRule;

      const ast: LintNode = {
        type: 'Program',
        line: 1,
        body: [
          {
            type: 'FunctionDeclaration',
            name: 'A',
            line: 2,
            body: [{ type: 'VariableDeclaration', name: 'shared', line: 3 }],
          },
          {
            type: 'FunctionDeclaration',
            name: 'B',
            line: 4,
            body: [{ type: 'Identifier', name: 'shared', line: 5 }],
          },
        ],
      };

      const diagnostics = lint(ast, [noUnusedVarsRule]);
      expect(diagnostics).to.have.lengthOf(0);
    },
  },
  {
    name: 'lint: with no rules, returns an empty diagnostics array without throwing on a tree with every node type',
    run: async ({ mod, expect }) => {
      const lint = mod.lint as (ast: LintNode, rules: unknown[]) => Diagnostic[];

      const ast: LintNode = {
        type: 'Program',
        line: 1,
        body: [
          {
            type: 'FunctionDeclaration',
            name: 'Widget',
            line: 2,
            body: [
              { type: 'VariableDeclaration', name: 'x', line: 3 },
              {
                type: 'IfStatement',
                line: 4,
                consequent: [{ type: 'ReturnStatement', line: 5 }],
                alternate: [{ type: 'CallExpression', callee: { name: 'useX' }, line: 6 }],
              },
            ],
          },
        ],
      };

      expect(lint(ast, [])).to.deep.equal([]);
    },
  },
];
