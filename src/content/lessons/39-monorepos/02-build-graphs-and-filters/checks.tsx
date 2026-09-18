import type { Check } from '../../../types';

type PkgDef = { path: string; dependencies: Record<string, string>; scripts?: Record<string, string> };
type Workspace = Record<string, PkgDef>;
type BuildOrderFn = (workspace: Workspace) => string[];
type AffectedFn = (workspace: Workspace, changedFiles: string[]) => string[];
type FilterExprFn = (workspace: Workspace, expr: string, changedFiles: string[]) => string[];

const diamond: Workspace = {
  app: { path: 'apps/app', dependencies: { ui: 'workspace:*', utils: 'workspace:*' } },
  ui: { path: 'packages/ui', dependencies: { utils: 'workspace:*' } },
  utils: { path: 'packages/utils', dependencies: {} },
  docs: { path: 'apps/docs', dependencies: { ui: 'workspace:*' } },
};

const cyclic: Workspace = {
  a: { path: 'packages/a', dependencies: { b: 'workspace:*' } },
  b: { path: 'packages/b', dependencies: { a: 'workspace:*' } },
};

export const checks: Check[] = [
  {
    name: 'buildOrder: every internal dependency appears before its dependent, ties broken alphabetically',
    run: async ({ mod, expect }) => {
      const buildOrder = mod.buildOrder as BuildOrderFn;
      const order = buildOrder(diamond);
      // utils has no internal deps, so it must be buildable first; app/docs depend on ui.
      expect(order.indexOf('utils')).to.be.lessThan(order.indexOf('ui'));
      expect(order.indexOf('ui')).to.be.lessThan(order.indexOf('app'));
      expect(order.indexOf('ui')).to.be.lessThan(order.indexOf('docs'));
      // deterministic tie-break: once ui and utils are both placed, app and docs are
      // both buildable at the same time, so the alphabetically first one (app) comes next.
      expect(order).to.deep.equal(['utils', 'ui', 'app', 'docs']);
    },
  },
  {
    name: 'buildOrder: a cycle in the internal dependency graph throws instead of hanging or dropping packages',
    run: async ({ mod, expect }) => {
      const buildOrder = mod.buildOrder as BuildOrderFn;
      expect(() => buildOrder(cyclic)).to.throw();
    },
  },
  {
    name: 'affected: a change to a leaf package with no dependents affects only itself',
    run: async ({ mod, expect }) => {
      const affected = mod.affected as AffectedFn;
      const result = affected(diamond, ['apps/docs/src/index.tsx']);
      expect(result).to.deep.equal(['docs']);
    },
  },
  {
    name: 'affected: a change deep in the dependency graph propagates to every transitive dependent, sorted, no dupes',
    run: async ({ mod, expect }) => {
      const affected = mod.affected as AffectedFn;
      const result = affected(diamond, ['packages/utils/src/index.ts']);
      expect(result).to.deep.equal(['app', 'docs', 'ui', 'utils']);
    },
  },
  {
    name: 'filterExpr: "name..." returns the package and everything it depends on; "...name" returns it and its dependents',
    run: async ({ mod, expect }) => {
      const filterExpr = mod.filterExpr as FilterExprFn;
      expect(filterExpr(diamond, 'app...', [])).to.deep.equal(['app', 'ui', 'utils']);
      expect(filterExpr(diamond, '...ui', [])).to.deep.equal(['app', 'docs', 'ui']);
      expect(filterExpr(diamond, 'utils', [])).to.deep.equal(['utils']);
    },
  },
  {
    name: 'filterExpr: "[origin/main]" delegates to affected, and an unknown package name throws',
    run: async ({ mod, expect }) => {
      const filterExpr = mod.filterExpr as FilterExprFn;
      const result = filterExpr(diamond, '[origin/main]', ['packages/utils/src/index.ts']);
      expect(result).to.deep.equal(['app', 'docs', 'ui', 'utils']);
      expect(() => filterExpr(diamond, 'nonexistent', [])).to.throw();
    },
  },
];
