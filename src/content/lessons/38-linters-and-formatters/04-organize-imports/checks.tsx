import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'organizeImports: groups node, package, alias, and relative imports in that order, one blank line between groups',
    run: async ({ mod, expect }) => {
      const organizeImports = mod.organizeImports as (source: string) => string;
      const input = [
        "import { readFile } from 'node:fs';",
        "import { z } from 'zeta';",
        "import { helper } from '@/lib/helper';",
        "import { local } from './local';",
      ].join('\n');

      const expected = [
        "import { readFile } from 'node:fs';",
        '',
        "import { z } from 'zeta';",
        '',
        "import { helper } from '@/lib/helper';",
        '',
        "import { local } from './local';",
        '',
      ].join('\n');

      expect(organizeImports(input)).to.equal(expected);
    },
  },
  {
    name: 'organizeImports: merges duplicate imports from the same module and sorts specifiers alphabetically',
    run: async ({ mod, expect }) => {
      const organizeImports = mod.organizeImports as (source: string) => string;
      const input = ["import { z, a } from 'utils';", "import { m } from 'utils';"].join('\n');

      expect(organizeImports(input)).to.equal("import { a, m, z } from 'utils';\n");
    },
  },
  {
    name: 'organizeImports: keeps side-effect imports first, in their original relative order, ahead of any sorted group',
    run: async ({ mod, expect }) => {
      const organizeImports = mod.organizeImports as (source: string) => string;
      const input = ["import './b.css';", "import './a.css';", "import { x } from 'pkg';"].join('\n');

      const expected = ["import './b.css';", "import './a.css';", '', "import { x } from 'pkg';", ''].join('\n');

      expect(organizeImports(input)).to.equal(expected);
    },
  },
  {
    name: 'organizeImports: a type-only import and a value import from the same module stay as two separate lines, and trailing source is preserved after one blank line',
    run: async ({ mod, expect }) => {
      const organizeImports = mod.organizeImports as (source: string) => string;
      const input = [
        "import type { Foo } from './mod';",
        "import { bar } from './mod';",
        '',
        'export const x = 1;',
      ].join('\n');

      const expected = [
        "import type { Foo } from './mod';",
        "import { bar } from './mod';",
        '',
        'export const x = 1;',
      ].join('\n');

      expect(organizeImports(input)).to.equal(expected);
    },
  },
  {
    name: 'organizeImports: two named imports of the same kind from the same module merge without duplicating a specifier that appears in both',
    run: async ({ mod, expect }) => {
      const organizeImports = mod.organizeImports as (source: string) => string;
      const input = ["import { shared, onlyA } from './x';", "import { shared, onlyB } from './x';"].join('\n');

      expect(organizeImports(input)).to.equal("import { onlyA, onlyB, shared } from './x';\n");
    },
  },
];
