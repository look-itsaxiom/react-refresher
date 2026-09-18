import type { Check } from '../../../types';
import type { ImportMap } from './solution';

type ResolveFn = (specifier: string, importMap: ImportMap, referrerUrl: string) => string;

export const checks: Check[] = [
  {
    name: 'resolves an exact bare specifier from the top-level imports map',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const map: ImportMap = { imports: { 'lodash-es': 'https://esm.sh/lodash-es@4.17.21' } };
      expect(resolveSpecifier('lodash-es', map, 'https://example.com/src/main.js')).to.equal(
        'https://esm.sh/lodash-es@4.17.21',
      );
    },
  },
  {
    name: 'resolves a trailing-slash prefix mapping, appending the remainder, and picks the longest matching prefix',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const map: ImportMap = {
        imports: {
          'app/': '/src/',
          'app/special/': '/special-src/',
        },
      };
      expect(resolveSpecifier('app/utils/format.js', map, 'https://example.com/main.js')).to.equal(
        '/src/utils/format.js',
      );
      // "app/special/" is a longer, more specific prefix than "app/" and must win.
      expect(resolveSpecifier('app/special/widget.js', map, 'https://example.com/main.js')).to.equal(
        '/special-src/widget.js',
      );
    },
  },
  {
    name: 'relative and absolute URL specifiers bypass the import map entirely',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const map: ImportMap = { imports: { './helpers.js': 'https://should-not-be-used.example/x.js' } };
      expect(resolveSpecifier('./helpers.js', map, 'https://example.com/src/main.js')).to.equal(
        'https://example.com/src/helpers.js',
      );
      expect(resolveSpecifier('../shared/util.js', map, 'https://example.com/src/main.js')).to.equal(
        'https://example.com/shared/util.js',
      );
      expect(resolveSpecifier('https://cdn.example.com/a.js', map, 'https://example.com/src/main.js')).to.equal(
        'https://cdn.example.com/a.js',
      );
    },
  },
  {
    name: 'uses the most specific scope that is a prefix of the referrer, over the top-level map',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const map: ImportMap = {
        imports: { 'lodash-es': 'https://esm.sh/lodash-es@4.17.21' },
        scopes: {
          'https://example.com/vendor/': { 'lodash-es': 'https://esm.sh/lodash-es@3.10.1' },
        },
      };
      expect(resolveSpecifier('lodash-es', map, 'https://example.com/vendor/widget.js')).to.equal(
        'https://esm.sh/lodash-es@3.10.1',
      );
      expect(resolveSpecifier('lodash-es', map, 'https://example.com/src/main.js')).to.equal(
        'https://esm.sh/lodash-es@4.17.21',
      );
    },
  },
  {
    name: 'when the matched scope does not resolve the specifier, falls through to the top-level imports map',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const map: ImportMap = {
        imports: { 'shared-utils': 'https://esm.sh/shared-utils@2.0.0' },
        scopes: {
          'https://example.com/vendor/': { 'lodash-es': 'https://esm.sh/lodash-es@3.10.1' },
        },
      };
      expect(resolveSpecifier('shared-utils', map, 'https://example.com/vendor/widget.js')).to.equal(
        'https://esm.sh/shared-utils@2.0.0',
      );
    },
  },
  {
    name: 'throws a descriptive error for an unmapped bare specifier',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const map: ImportMap = { imports: { 'lodash-es': 'https://esm.sh/lodash-es@4.17.21' } };
      expect(() => resolveSpecifier('unmapped-thing', map, 'https://example.com/main.js')).to.throw(/unmapped-thing/);
    },
  },
  {
    name: 'throws for a specifier explicitly blocked with a null map value, in a scope or at the top level',
    run: async ({ mod, expect }) => {
      const resolveSpecifier = mod.resolveSpecifier as ResolveFn;
      const blockedAtTop: ImportMap = { imports: { moment: null } };
      expect(() => resolveSpecifier('moment', blockedAtTop, 'https://example.com/main.js')).to.throw();

      const blockedInScope: ImportMap = {
        imports: { moment: 'https://esm.sh/moment@2.30.0' },
        scopes: { 'https://example.com/legacy/': { moment: null } },
      };
      expect(() => resolveSpecifier('moment', blockedInScope, 'https://example.com/legacy/old.js')).to.throw();
      // outside the scope, the top-level entry still resolves normally
      expect(resolveSpecifier('moment', blockedInScope, 'https://example.com/main.js')).to.equal(
        'https://esm.sh/moment@2.30.0',
      );
    },
  },
];
