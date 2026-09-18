import type { Check } from '../../../types';
import type { ExportsTarget, PackageJson } from './solution';

type ResolveFn = (pkg: PackageJson, subpath: string, conditions: string[]) => string;
type HazardFn = (pkg: PackageJson) => boolean;

export const checks: Check[] = [
  {
    name: 'resolves a conditions object with no "." wrapper as the target for subpath "."',
    run: async ({ mod, expect }) => {
      const resolvePackageExports = mod.resolvePackageExports as ResolveFn;
      const pkg: PackageJson = { exports: { import: './dist/index.mjs', require: './dist/index.cjs' } };
      expect(resolvePackageExports(pkg, '.', ['import'])).to.equal('./dist/index.mjs');
      expect(resolvePackageExports(pkg, '.', ['require'])).to.equal('./dist/index.cjs');
    },
  },
  {
    name: 'resolves a subpath map, choosing the first matching condition key in declared order, with "default" as fallback',
    run: async ({ mod, expect }) => {
      const resolvePackageExports = mod.resolvePackageExports as ResolveFn;
      const pkg: PackageJson = {
        exports: {
          '.': { 'react-server': './dist/server.mjs', import: './dist/index.mjs', default: './dist/index.cjs' },
          './client': { import: './dist/client.mjs', default: './dist/client.cjs' },
        },
      };
      expect(resolvePackageExports(pkg, '.', ['react-server', 'import'])).to.equal('./dist/server.mjs');
      expect(resolvePackageExports(pkg, '.', ['import'])).to.equal('./dist/index.mjs');
      expect(resolvePackageExports(pkg, '.', ['browser'])).to.equal('./dist/index.cjs');
      expect(resolvePackageExports(pkg, './client', ['require'])).to.equal('./dist/client.cjs');
    },
  },
  {
    name: 'resolves a pattern subpath, substituting the captured segment, and prefers the longer-prefix pattern',
    run: async ({ mod, expect }) => {
      const resolvePackageExports = mod.resolvePackageExports as ResolveFn;
      const pkg: PackageJson = {
        exports: {
          '.': './dist/index.mjs',
          './features/*': { import: './dist/features/*.mjs' },
          './features/beta/*': { import: './dist/beta/*.mjs' },
        },
      };
      expect(resolvePackageExports(pkg, './features/charts', ['import'])).to.equal('./dist/features/charts.mjs');
      // "./features/beta/*" has a longer prefix than "./features/*" and must win for a beta subpath.
      expect(resolvePackageExports(pkg, './features/beta/table', ['import'])).to.equal('./dist/beta/table.mjs');
    },
  },
  {
    name: 'an exact subpath key wins over a pattern key even when both could match',
    run: async ({ mod, expect }) => {
      const resolvePackageExports = mod.resolvePackageExports as ResolveFn;
      const pkg: PackageJson = {
        exports: {
          '.': './dist/index.mjs',
          './features/*': './dist/features/*.mjs',
          './features/charts': './dist/special-charts.mjs',
        },
      };
      expect(resolvePackageExports(pkg, './features/charts', ['import'])).to.equal('./dist/special-charts.mjs');
    },
  },
  {
    name: 'throws for a missing exports field, a blocked (null) target, an unexported subpath, a no-matching-condition case, and a mixed subpath/condition object',
    run: async ({ mod, expect }) => {
      const resolvePackageExports = mod.resolvePackageExports as ResolveFn;

      expect(() => resolvePackageExports({}, '.', ['import'])).to.throw();

      const blocked: PackageJson = { exports: { '.': './dist/index.mjs', './internal': null as unknown as ExportsTarget } };
      expect(() => resolvePackageExports(blocked, './internal', ['import'])).to.throw();

      const noSuchSubpath: PackageJson = { exports: { '.': './dist/index.mjs' } };
      expect(() => resolvePackageExports(noSuchSubpath, './missing', ['import'])).to.throw();

      const noMatchingCondition: PackageJson = { exports: { '.': { 'react-native': './dist/rn.mjs' } } };
      expect(() => resolvePackageExports(noMatchingCondition, '.', ['import'])).to.throw();

      const mixed: PackageJson = { exports: { '.': './dist/index.mjs', import: './dist/other.mjs' } as unknown as Record<string, ExportsTarget> };
      expect(() => resolvePackageExports(mixed, '.', ['import'])).to.throw();
    },
  },
  {
    name: 'hazardCheck flags different import/require targets as a hazard, and reports no hazard when they match or either fails',
    run: async ({ mod, expect }) => {
      const hazardCheck = mod.hazardCheck as HazardFn;

      const hazardous: PackageJson = { exports: { '.': { import: './dist/index.mjs', require: './dist/index.cjs' } } };
      expect(hazardCheck(hazardous)).to.equal(true);

      const sameFileBothConditions: PackageJson = { exports: { '.': { import: './dist/index.js', require: './dist/index.js' } } };
      expect(hazardCheck(sameFileBothConditions)).to.equal(false);

      const requireOnly: PackageJson = { exports: { '.': { import: './dist/index.mjs' } } };
      expect(hazardCheck(requireOnly)).to.equal(false);
    },
  },
];
