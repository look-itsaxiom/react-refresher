import type { Check } from '../../../types';

type DepNode = { name: string; version: string; deps: DepNode[] };
type HoistFn = (root: DepNode) => Record<string, string>;
type PhantomFn = (layout: Record<string, string>, rootDeps: string[], imports: string[]) => string[];

const conflictTree: DepNode = {
  name: 'app',
  version: '0.0.0',
  deps: [
    { name: 'b', version: '1.0.0', deps: [] },
    { name: 'a', version: '1.0.0', deps: [{ name: 'b', version: '2.0.0', deps: [] }] },
  ],
};

const dedupeTree: DepNode = {
  name: 'app',
  version: '0.0.0',
  deps: [
    { name: 'a', version: '1.0.0', deps: [{ name: 'c', version: '3.0.0', deps: [] }] },
    { name: 'b', version: '1.0.0', deps: [{ name: 'c', version: '3.0.0', deps: [] }] },
  ],
};

const phantomTree: DepNode = {
  name: 'app',
  version: '0.0.0',
  deps: [
    { name: 'b', version: '1.0.0', deps: [] },
    {
      name: 'a',
      version: '1.0.0',
      deps: [
        { name: 'b', version: '2.0.0', deps: [] },
        { name: 'left-pad', version: '1.3.0', deps: [] },
      ],
    },
  ],
};

export const checks: Check[] = [
  {
    name: 'hoist: a conflicting version nests directly under the package that depends on it',
    run: async ({ mod, expect }) => {
      const hoist = mod.hoist as HoistFn;
      expect(hoist(conflictTree)).to.deep.equal({
        'node_modules/b': '1.0.0',
        'node_modules/a': '1.0.0',
        'node_modules/a/node_modules/b': '2.0.0',
      });
    },
  },
  {
    name: 'hoist: the same name+version reached through two different branches dedupes to one entry',
    run: async ({ mod, expect }) => {
      const hoist = mod.hoist as HoistFn;
      expect(hoist(dedupeTree)).to.deep.equal({
        'node_modules/a': '1.0.0',
        'node_modules/c': '3.0.0',
        'node_modules/b': '1.0.0',
      });
    },
  },
  {
    name: 'hoist: an undeclared transitive dependency with no conflict still hoists all the way to the top',
    run: async ({ mod, expect }) => {
      const hoist = mod.hoist as HoistFn;
      const layout = hoist(phantomTree);
      expect(layout['node_modules/left-pad']).to.equal('1.3.0');
    },
  },
  {
    name: 'phantomImports: flags a top-level import that only resolves via hoisting, not via a declared dependency',
    run: async ({ mod, expect }) => {
      const hoist = mod.hoist as HoistFn;
      const phantomImports = mod.phantomImports as PhantomFn;
      const layout = hoist(phantomTree);
      const result = phantomImports(layout, ['a', 'b'], ['a', 'b', 'left-pad']);
      expect(result).to.deep.equal(['left-pad']);
    },
  },
  {
    name: 'phantomImports: a declared dependency is never flagged, and a name that only resolves nested (not at the top level) is never flagged either',
    run: async ({ mod, expect }) => {
      const phantomImports = mod.phantomImports as PhantomFn;
      const layout = { 'node_modules/a': '1.0.0', 'node_modules/a/node_modules/b': '2.0.0' };
      // 'a' is declared, so not phantom even though it's top-level.
      // 'b' only exists nested under 'a' — the project's own code can't reach it via
      // Node's resolution, so it isn't a phantom dependency either, just unresolvable.
      expect(phantomImports(layout, ['a'], ['a', 'b'])).to.deep.equal([]);
    },
  },
];
