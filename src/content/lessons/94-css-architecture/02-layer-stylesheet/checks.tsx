import type { Check } from '../../../types';

type Specificity = [number, number, number];
type LayerName = 'reset' | 'base' | 'tokens' | 'components' | 'utilities' | 'overrides';
type LayerChunk = { layer: LayerName | null; css: string };
type LayerResult = { css: string; warnings: string[] };

/** Extracts a full `@layer <name> { ... }` block, correctly matching nested rule braces. */
function extractLayerBlock(css: string, layerName: string): string | null {
  const marker = `@layer ${layerName} {`;
  const start = css.indexOf(marker);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return css.slice(start);
}

export const checks: Check[] = [
  {
    name: 'specificity() counts ids, classes, and types, ignoring combinators and the universal selector',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => Specificity;
      expect(specificity('#a .b c')).to.deep.equal([1, 1, 1]);
      expect(specificity('*')).to.deep.equal([0, 0, 0]);
      expect(specificity('.card > .title')).to.deep.equal([0, 2, 0]);
    },
  },
  {
    name: ':where() always contributes zero specificity, even with an id inside',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => Specificity;
      expect(specificity(':where(.x) p')).to.deep.equal([0, 0, 1]);
      expect(specificity(':where(#a, .b)')).to.deep.equal([0, 0, 0]);
    },
  },
  {
    name: ':is()/:not()/:has() take the specificity of their most specific argument, not the sum, and nest correctly',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => Specificity;
      expect(specificity(':is(#a, .b)')).to.deep.equal([1, 0, 0]);
      expect(specificity('.card:has(img)')).to.deep.equal([0, 1, 1]);
      expect(specificity(':has(:not(.a))')).to.deep.equal([0, 1, 0]);
    },
  },
  {
    name: 'compound selectors count a type, a pseudo-class, and a pseudo-element separately',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => Specificity;
      expect(specificity('a:hover::before')).to.deep.equal([0, 1, 2]);
    },
  },
  {
    name: 'layerStylesheet() opens with an @layer statement declaring the order and only emits blocks for layers that have chunks',
    run: async ({ mod, expect }) => {
      const layerStylesheet = mod.layerStylesheet as (chunks: LayerChunk[], order?: LayerName[]) => LayerResult;
      const result = layerStylesheet([
        { layer: 'components', css: '.card { padding: 1rem; }' },
        { layer: 'utilities', css: '.p-0 { padding: 0; }' },
      ]);
      const lines = result.css.split('\n');
      expect((lines[0] ?? '').trim()).to.equal('@layer reset, base, tokens, components, utilities, overrides;');
      expect(extractLayerBlock(result.css, 'reset')).to.equal(null);
      expect(extractLayerBlock(result.css, 'base')).to.equal(null);
      expect(extractLayerBlock(result.css, 'components')).to.not.equal(null);
      expect(extractLayerBlock(result.css, 'utilities')).to.not.equal(null);
      // components was declared before utilities in the input, and it must stay before
      // utilities in the output because that is the declared layer order.
      expect(result.css.indexOf('@layer components {')).to.be.lessThan(result.css.indexOf('@layer utilities {'));
    },
  },
  {
    name: 'layerStylesheet() merges multiple chunks tagged with the same layer, in input order, inside one block',
    run: async ({ mod, expect }) => {
      const layerStylesheet = mod.layerStylesheet as (chunks: LayerChunk[], order?: LayerName[]) => LayerResult;
      const result = layerStylesheet([
        { layer: 'utilities', css: '.p-0 { padding: 0; }' },
        { layer: 'components', css: '.card { padding: 1rem; }' },
        { layer: 'utilities', css: '.m-0 { margin: 0; }' },
      ]);
      const utilitiesBlock = extractLayerBlock(result.css, 'utilities')!;
      expect(utilitiesBlock).to.include('.p-0');
      expect(utilitiesBlock).to.include('.m-0');
      expect(utilitiesBlock.indexOf('.p-0')).to.be.lessThan(utilitiesBlock.indexOf('.m-0'));
      // Only one @layer utilities block should exist, not one per chunk.
      expect(result.css.split('@layer utilities {').length - 1).to.equal(1);
    },
  },
  {
    name: 'a null-layer chunk is left outside every @layer block and produces one warning per chunk',
    run: async ({ mod, expect }) => {
      const layerStylesheet = mod.layerStylesheet as (chunks: LayerChunk[], order?: LayerName[]) => LayerResult;
      const result = layerStylesheet([
        { layer: null, css: '.legacy-a { color: red; }' },
        { layer: 'components', css: '.card { padding: 1rem; }' },
        { layer: null, css: '.legacy-b { color: blue; }' },
      ]);
      expect(result.warnings.length).to.equal(2);
      expect(result.css).to.include('.legacy-a');
      expect(result.css).to.include('.legacy-b');
      // The unlayered rules must not be nested inside the @layer components block.
      const componentsBlock = extractLayerBlock(result.css, 'components')!;
      expect(componentsBlock).to.not.include('.legacy-a');
      expect(componentsBlock).to.not.include('.legacy-b');
    },
  },
  {
    name: 'reset/base selectors are wrapped in :where(), already-:where() selectors are left alone, and other layers are untouched',
    run: async ({ mod, expect }) => {
      const layerStylesheet = mod.layerStylesheet as (chunks: LayerChunk[], order?: LayerName[]) => LayerResult;
      const result = layerStylesheet([
        { layer: 'reset', css: 'h1, h2, .title { margin: 0; }' },
        { layer: 'base', css: ':where(.icon) { display: inline-block; }' },
        { layer: 'components', css: '.card { padding: 1rem; }' },
      ]);
      const resetBlock = extractLayerBlock(result.css, 'reset')!;
      const baseBlock = extractLayerBlock(result.css, 'base')!;
      const componentsBlock = extractLayerBlock(result.css, 'components')!;
      expect(resetBlock).to.include(':where(h1)');
      expect(resetBlock).to.include(':where(h2)');
      expect(resetBlock).to.include(':where(.title)');
      // Already-:where() selectors must not be double-wrapped.
      expect(baseBlock).to.not.include(':where(:where(.icon))');
      expect(baseBlock).to.include(':where(.icon)');
      // Selectors outside reset/base are left exactly as written.
      expect(componentsBlock).to.include('.card {');
      expect(componentsBlock).to.not.include(':where(.card)');
    },
  },
];
