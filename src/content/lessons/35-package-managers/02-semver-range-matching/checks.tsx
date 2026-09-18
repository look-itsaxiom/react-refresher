import type { Check } from '../../../types';

type SatisfiesFn = (version: string, range: string) => boolean;
type MaxSatisfyingFn = (versions: string[], range: string) => string | null;

const satisfiesCases: [version: string, range: string, expected: boolean][] = [
  ['1.2.3', '1.2.3', true],
  ['1.2.4', '1.2.3', false],
  ['1.2.3', '^1.2.3', true],
  ['1.9.9', '^1.2.3', true],
  ['2.0.0', '^1.2.3', false],
  ['1.2.2', '^1.2.3', false],
  ['0.4.9', '^0.4.0', true],
  ['0.5.0', '^0.4.0', false],
  ['0.4.0', '^0.4.0', true],
  ['0.0.3', '^0.0.3', true],
  ['0.0.4', '^0.0.3', false],
  ['1.2.3', '~1.2.3', true],
  ['1.2.9', '~1.2.3', true],
  ['1.3.0', '~1.2.3', false],
  ['1.2.2', '~1.2.3', false],
  ['1.5.0', '>=1.0.0 <2.0.0', true],
  ['2.0.0', '>=1.0.0 <2.0.0', false],
  ['0.9.9', '>=1.0.0 <2.0.0', false],
  ['3.7.1', '*', true],
  ['1.0.0', '^1.0.0 || ^2.0.0', true],
  ['2.5.0', '^1.0.0 || ^2.0.0', true],
  ['3.0.0', '^1.0.0 || ^2.0.0', false],
  // prerelease exclusion
  ['2.0.0-rc.1', '^2.0.0', false],
  ['2.0.0-rc.1', '2.0.0-rc.1', true],
  ['2.0.0-rc.2', '2.0.0-rc.1', false],
  ['2.0.0-rc.1', '*', false],
  ['1.0.0-2', '>=1.0.0-alpha', false],
  ['1.0.0-alpha', '>=1.0.0-2', true],
];

const maxSatisfyingCases: [versions: string[], range: string, expected: string | null][] = [
  [['1.0.0', '1.2.3', '1.9.9', '2.0.0'], '^1.2.3', '1.9.9'],
  [['1.0.0', '1.2.2'], '^1.2.3', null],
  [['0.4.0', '0.4.5', '0.4.9', '0.5.0'], '^0.4.0', '0.4.9'],
  [['1.0.0', '2.0.0', '2.5.3', '3.0.0'], '^1.0.0 || ^2.0.0', '2.5.3'],
  [['2.0.0', '2.0.0-rc.1', '2.0.0-rc.2'], '2.0.0-rc.1 || 2.0.0-rc.2', '2.0.0-rc.2'],
];

export const checks: Check[] = [
  {
    name: 'satisfies: exact, caret (including 0.x special cases), tilde, comparators, and OR ranges',
    run: async ({ mod, expect }) => {
      const satisfies = mod.satisfies as SatisfiesFn;
      for (const [version, range, expected] of satisfiesCases.slice(0, 21)) {
        expect(satisfies(version, range), `satisfies(${version}, ${range})`).to.equal(expected);
      }
    },
  },
  {
    name: 'satisfies: a prerelease version only matches a clause that mentions a prerelease of the same major.minor.patch',
    run: async ({ mod, expect }) => {
      const satisfies = mod.satisfies as SatisfiesFn;
      for (const [version, range, expected] of satisfiesCases.slice(21)) {
        expect(satisfies(version, range), `satisfies(${version}, ${range})`).to.equal(expected);
      }
    },
  },
  {
    name: 'maxSatisfying: returns the highest matching version, or null when nothing matches',
    run: async ({ mod, expect }) => {
      const maxSatisfying = mod.maxSatisfying as MaxSatisfyingFn;
      for (const [versions, range, expected] of maxSatisfyingCases) {
        expect(maxSatisfying(versions, range), `maxSatisfying(${JSON.stringify(versions)}, ${range})`).to.equal(expected);
      }
    },
  },
];
