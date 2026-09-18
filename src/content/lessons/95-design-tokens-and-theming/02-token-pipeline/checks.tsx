import type { Check } from '../../../types';

type DtcgTree = Record<string, unknown>;
type BuildTokensResult = { css: string; toTs(): string };
type BuildTokensFn = (dtcg: DtcgTree, options?: Record<string, unknown>) => BuildTokensResult;
type LintIssue = { path: string; rule: string; message: string };
type LintTokensFn = (tree: DtcgTree) => LintIssue[];

export const checks: Check[] = [
  {
    name: 'flattens a nested tree into a prefixed CSS custom property in :root',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const result = buildTokens(
        { color: { brand: { 500: { $value: '#3b82f6', $type: 'color' } } } },
        { prefix: 'tc' },
      );
      expect(result.css).to.match(/:root\s*\{[^}]*--tc-color-brand-500:\s*#3b82f6;/);
    },
  },
  {
    name: 'an alias stays a var() reference in the CSS output instead of a copied literal',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const result = buildTokens(
        {
          color: { brand: { 500: { $value: '#3b82f6', $type: 'color' } } },
          semantic: { color: { bg: { $value: '{color.brand.500}', $type: 'color' } } },
        },
        { prefix: 'tc' },
      );
      expect(result.css).to.match(/--tc-semantic-color-bg:\s*var\(\s*--tc-color-brand-500\s*\);/);
      expect(result.css).to.not.match(/--tc-semantic-color-bg:\s*#3b82f6/);
    },
  },
  {
    name: 'an alias cycle throws',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const cyclic: DtcgTree = {
        a: { $value: '{b}', $type: 'color' },
        b: { $value: '{a}', $type: 'color' },
      };
      expect(() => buildTokens(cyclic)).to.throw();
    },
  },
  {
    name: 'an alias pointing at a nonexistent path throws',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const dangling: DtcgTree = {
        semantic: { color: { bg: { $value: '{color.does.not.exist}', $type: 'color' } } },
      };
      expect(() => buildTokens(dangling)).to.throw();
    },
  },
  {
    name: 'a dimension composite formats as value+unit',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const result = buildTokens(
        { space: { 4: { $value: { value: 4, unit: 'px' }, $type: 'dimension' } } },
        { prefix: 'tc' },
      );
      expect(result.css).to.match(/--tc-space-4:\s*4px;/);
    },
  },
  {
    name: 'a typography composite emits one custom property per sub-key',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const result = buildTokens(
        {
          text: {
            heading: {
              $value: { fontSize: { value: 1.5, unit: 'rem' }, fontWeight: 600, lineHeight: 1.2 },
              $type: 'typography',
            },
          },
        },
        { prefix: 'tc' },
      );
      expect(result.css).to.match(/--tc-text-heading-font-size:\s*1\.5rem;/);
      expect(result.css).to.match(/--tc-text-heading-font-weight:\s*600;/);
      expect(result.css).to.match(/--tc-text-heading-line-height:\s*1\.2;/);
    },
  },
  {
    name: 'each theme emits its own [data-theme="name"] block containing only its overrides',
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const result = buildTokens(
        { semantic: { color: { bg: { $value: '#ffffff', $type: 'color' } } } },
        { prefix: 'tc', themes: { dark: { semantic: { color: { bg: { $value: '#0f1115', $type: 'color' } } } } } },
      );
      const darkBlockMatch = result.css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
      expect(darkBlockMatch, 'expected a [data-theme="dark"] block').to.not.equal(null);
      expect(darkBlockMatch![1]).to.match(/--tc-semantic-color-bg:\s*#0f1115;/);
      // the base :root value should be untouched
      expect(result.css).to.match(/:root\s*\{[^}]*--tc-semantic-color-bg:\s*#ffffff;/);
    },
  },
  {
    name: "toTs() resolves aliases to literal values, with no var() references left",
    run: async ({ mod, expect }) => {
      const buildTokens = mod.buildTokens as BuildTokensFn;
      const result = buildTokens(
        {
          color: { brand: { 500: { $value: '#3b82f6', $type: 'color' } } },
          semantic: { color: { bg: { $value: '{color.brand.500}', $type: 'color' } } },
        },
        { prefix: 'tc' },
      );
      const ts = result.toTs();
      expect(ts).to.include('#3b82f6');
      expect(ts).to.not.include('var(');
    },
  },
  {
    name: 'lintTokens flags a semantic token with a raw value and any token missing $type',
    run: async ({ mod, expect }) => {
      const lintTokens = mod.lintTokens as LintTokensFn;
      const issues = lintTokens({
        color: { brand: { 500: { $value: '#3b82f6', $type: 'color' } } },
        semantic: {
          color: {
            bg: { $value: '{color.brand.500}', $type: 'color' }, // fine: aliases a primitive
            danger: { $value: '#ff0000', $type: 'color' }, // bad: raw value at semantic tier
            spacing: { $value: '4px' }, // bad: missing $type
          },
        },
      });
      const rules = issues.map((i) => `${i.path}:${i.rule}`);
      expect(rules).to.include('semantic.color.danger:raw-value-in-semantic');
      expect(rules).to.include('semantic.color.spacing:missing-type');
      expect(rules).to.not.include('semantic.color.bg:raw-value-in-semantic');
    },
  },
];
