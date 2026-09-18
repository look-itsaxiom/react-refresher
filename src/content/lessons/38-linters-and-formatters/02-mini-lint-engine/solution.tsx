export type LintNode =
  | { type: 'Program'; body: LintNode[]; line: number }
  | { type: 'FunctionDeclaration'; name: string; body: LintNode[]; line: number }
  | { type: 'CallExpression'; callee: { name: string }; line: number }
  | { type: 'IfStatement'; consequent: LintNode[]; alternate?: LintNode[]; line: number }
  | { type: 'VariableDeclaration'; name: string; line: number }
  | { type: 'Identifier'; name: string; line: number }
  | { type: 'ReturnStatement'; line: number };

export type Diagnostic = { ruleId: string; message: string; line: number };

export type RuleContext = {
  report(message: string, line: number): void;
  /** Ancestor nodes from the root down to (but not including) the current node. */
  ancestors: LintNode[];
  /** Nodes that appear earlier in the same body array as the current node. */
  precedingSiblings: LintNode[];
};

type VisitorFn = (node: LintNode, ctx: RuleContext) => void;

export type Rule = {
  ruleId: string;
  create(): Partial<Record<LintNode['type'], VisitorFn>> & { 'Program:exit'?: VisitorFn };
};

// Returns the arrays of child statements a node can contain, in traversal order.
// Program and FunctionDeclaration each have one body array; IfStatement has one or two
// (consequent, and alternate if present). Every other node type is a leaf.
function childArrays(node: LintNode): LintNode[][] {
  switch (node.type) {
    case 'Program':
    case 'FunctionDeclaration':
      return [node.body];
    case 'IfStatement':
      return node.alternate ? [node.consequent, node.alternate] : [node.consequent];
    default:
      return [];
  }
}

export function lint(ast: LintNode, rules: Rule[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const instances = rules.map((rule) => {
    const visitor = rule.create();
    const report = (message: string, line: number) => {
      diagnostics.push({ ruleId: rule.ruleId, message, line });
    };
    return { visitor, report };
  });

  function walk(node: LintNode, ancestors: LintNode[], precedingSiblings: LintNode[]): void {
    for (const { visitor, report } of instances) {
      const handler = visitor[node.type];
      handler?.(node, { report, ancestors, precedingSiblings });
    }

    for (const arr of childArrays(node)) {
      for (let i = 0; i < arr.length; i++) {
        walk(arr[i]!, [...ancestors, node], arr.slice(0, i));
      }
    }
  }

  walk(ast, [], []);

  for (const { visitor, report } of instances) {
    visitor['Program:exit']?.(ast, { report, ancestors: [], precedingSiblings: [] });
  }

  return diagnostics;
}

// A hook call (name starts with "use") is invalid if it's nested inside a conditional,
// or if it comes after an earlier sibling that's a ReturnStatement (an early return).
export const rulesOfHooksRule: Rule = {
  ruleId: 'rules-of-hooks',
  create() {
    return {
      CallExpression(node, ctx) {
        if (node.type !== 'CallExpression') return;
        if (!node.callee.name.startsWith('use')) return;
        const insideConditional = ctx.ancestors.some((a) => a.type === 'IfStatement');
        const afterEarlyReturn = ctx.precedingSiblings.some((s) => s.type === 'ReturnStatement');
        if (insideConditional) {
          ctx.report(`Hook "${node.callee.name}" is called conditionally.`, node.line);
        } else if (afterEarlyReturn) {
          ctx.report(`Hook "${node.callee.name}" is called after an early return.`, node.line);
        }
      },
    };
  },
};

// A VariableDeclaration whose name is never seen on an Identifier node anywhere else in
// the tree is unused. This needs the whole tree before it can report anything, hence
// 'Program:exit' instead of reporting directly from a VariableDeclaration visitor.
export const noUnusedVarsRule: Rule = {
  ruleId: 'no-unused-vars',
  create() {
    const declared = new Map<string, number>();
    const used = new Set<string>();
    return {
      VariableDeclaration(node) {
        if (node.type !== 'VariableDeclaration') return;
        declared.set(node.name, node.line);
      },
      Identifier(node) {
        if (node.type !== 'Identifier') return;
        used.add(node.name);
      },
      'Program:exit'(_node, ctx) {
        for (const [name, line] of declared) {
          if (!used.has(name)) ctx.report(`"${name}" is declared but never used.`, line);
        }
      },
    };
  },
};

const sampleAst: LintNode = {
  type: 'Program',
  line: 1,
  body: [
    {
      type: 'FunctionDeclaration',
      name: 'Panel',
      line: 2,
      body: [
        { type: 'VariableDeclaration', name: 'theme', line: 3 },
        { type: 'CallExpression', callee: { name: 'useTheme' }, line: 4 },
        { type: 'Identifier', name: 'theme', line: 5 },
        {
          type: 'IfStatement',
          line: 6,
          consequent: [{ type: 'CallExpression', callee: { name: 'useEffect' }, line: 7 }],
        },
        { type: 'VariableDeclaration', name: 'unused', line: 8 },
      ],
    },
  ],
};

export default function App() {
  const diagnostics = lint(sampleAst, [rulesOfHooksRule, noUnusedVarsRule]);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Diagnostics</h2>
      {diagnostics.length === 0 ? (
        <p>No problems found.</p>
      ) : (
        <ul>
          {diagnostics.map((d, i) => (
            <li key={i}>
              [{d.ruleId}] line {d.line}: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
