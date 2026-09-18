import type { Check } from '../../../types';

type SpecificityTuple = [number, number, number];
type CascadeDeclaration = {
  id: string;
  layer: string | null;
  specificity: SpecificityTuple;
  order: number;
  important: boolean;
  value: string;
};

export const checks: Check[] = [
  {
    name: 'specificity() counts ids, classes, and types, ignoring combinators',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => SpecificityTuple;
      expect(specificity('.card')).to.deep.equal([0, 1, 0]);
      expect(specificity('div.card#id')).to.deep.equal([1, 1, 1]);
      expect(specificity('.a > .b')).to.deep.equal([0, 2, 0]);
      expect(specificity('*')).to.deep.equal([0, 0, 0]);
    },
  },
  {
    name: ':where() always contributes zero specificity, even with an id inside',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => SpecificityTuple;
      expect(specificity(':where(#a, .b)')).to.deep.equal([0, 0, 0]);
      expect(specificity('.card:where(#a)')).to.deep.equal([0, 1, 0]);
    },
  },
  {
    name: ':is()/:has() take the specificity of their most specific argument, not the sum',
    run: async ({ mod, expect }) => {
      const specificity = mod.specificity as (selector: string) => SpecificityTuple;
      expect(specificity(':is(#a, .b)')).to.deep.equal([1, 0, 0]);
      expect(specificity('.card:has(img)')).to.deep.equal([0, 1, 1]);
      expect(specificity(':has(:not(.a))')).to.deep.equal([0, 1, 0]);
    },
  },
  {
    name: 'resolveCascade: unlayered normal beats layered normal regardless of specificity',
    run: async ({ mod, expect }) => {
      const resolveCascade = mod.resolveCascade as (
        decls: CascadeDeclaration[],
        layerOrder: string[],
      ) => CascadeDeclaration | null;
      const decls: CascadeDeclaration[] = [
        { id: 'layered-id', layer: 'components', specificity: [1, 0, 0], order: 0, important: false, value: 'a' },
        { id: 'unlayered-type', layer: null, specificity: [0, 0, 1], order: 1, important: false, value: 'b' },
      ];
      expect(resolveCascade(decls, ['components'])?.id).to.equal('unlayered-type');
    },
  },
  {
    name: 'resolveCascade: among normal layered rules, a later layer beats an earlier one',
    run: async ({ mod, expect }) => {
      const resolveCascade = mod.resolveCascade as (
        decls: CascadeDeclaration[],
        layerOrder: string[],
      ) => CascadeDeclaration | null;
      const decls: CascadeDeclaration[] = [
        { id: 'reset-id', layer: 'reset', specificity: [1, 0, 0], order: 0, important: false, value: 'a' },
        { id: 'utilities-type', layer: 'utilities', specificity: [0, 0, 1], order: 1, important: false, value: 'b' },
      ];
      expect(resolveCascade(decls, ['reset', 'utilities'])?.id).to.equal('utilities-type');
    },
  },
  {
    name: 'resolveCascade: importance flips layer precedence and beats unlayered normal',
    run: async ({ mod, expect }) => {
      const resolveCascade = mod.resolveCascade as (
        decls: CascadeDeclaration[],
        layerOrder: string[],
      ) => CascadeDeclaration | null;
      const decls: CascadeDeclaration[] = [
        { id: 'unlayered-normal', layer: null, specificity: [1, 0, 0], order: 0, important: false, value: 'a' },
        { id: 'reset-important', layer: 'reset', specificity: [0, 0, 0], order: 1, important: true, value: 'b' },
        { id: 'utilities-important', layer: 'utilities', specificity: [0, 0, 0], order: 2, important: true, value: 'c' },
      ];
      // Unlayered normal loses to any !important. Among the two !important layers, the
      // FIRST-declared layer (reset) wins over a later one (utilities).
      expect(resolveCascade(decls, ['reset', 'utilities'])?.id).to.equal('reset-important');
    },
  },
  {
    name: 'resolveCascade: same bucket and specificity ties are broken by later source order',
    run: async ({ mod, expect }) => {
      const resolveCascade = mod.resolveCascade as (
        decls: CascadeDeclaration[],
        layerOrder: string[],
      ) => CascadeDeclaration | null;
      const decls: CascadeDeclaration[] = [
        { id: 'first', layer: null, specificity: [0, 1, 0], order: 0, important: false, value: 'a' },
        { id: 'second', layer: null, specificity: [0, 1, 0], order: 1, important: false, value: 'b' },
      ];
      expect(resolveCascade(decls, [])?.id).to.equal('second');
      expect(resolveCascade([], [])).to.equal(null);
    },
  },
];
