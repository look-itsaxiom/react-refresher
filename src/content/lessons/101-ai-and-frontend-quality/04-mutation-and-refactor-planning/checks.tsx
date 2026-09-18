import type { Check } from '../../../types';

type Mutant = { id: string; description: string; source: string };
type ScoreResult = { total: number; killed: number; survived: Array<{ id: string; description: string }>; score: number };
type RefactorChange = {
  kind: 'codemod' | 'rename' | 'extract' | 'migrate-api' | 'compiler-enable';
  filesTouched: number;
  hasCharacterizationTests: boolean;
  visualSurface: boolean;
  behindFlag: boolean;
};
type PlanResult = { steps: string[]; gates: string[] };

function getFns(mod: Record<string, unknown>) {
  const mutate = mod.mutate;
  const mutationScore = mod.mutationScore;
  const refactorPlan = mod.refactorPlan;
  if (typeof mutate !== 'function') throw new Error('Expected the module to export `mutate`.');
  if (typeof mutationScore !== 'function') throw new Error('Expected the module to export `mutationScore`.');
  if (typeof refactorPlan !== 'function') throw new Error('Expected the module to export `refactorPlan`.');
  return {
    mutate: mutate as (fnSource: string) => Mutant[],
    mutationScore: mutationScore as (
      fnSource: string,
      tests: Array<(fn: (...args: any[]) => any) => boolean>,
    ) => ScoreResult,
    refactorPlan: refactorPlan as (change: RefactorChange) => PlanResult,
  };
}

const SCORE_SOURCE = `function score(a, b) {
  let total = a;
  if (a === b) {
    total = total + 10;
  }
  if (a > b) {
    total = total - 5;
  }
  if (a < 0) {
    total = 0;
  }
  const ok = a >= 0 && b >= 0;
  const bonus = ok || false;
  return bonus ? total : 0;
}`;

const CLASSIFY_SOURCE = `function classify(n, low, high) {
  if (n < low) return 'low';
  if (n > high) return 'high';
  return 'mid';
}`;

export const checks: Check[] = [
  {
    name: 'mutate() produces exactly 12 mutants for the `score` fixture',
    run: ({ mod, expect }) => {
      const { mutate } = getFns(mod);
      const mutants = mutate(SCORE_SOURCE);
      expect(mutants).to.have.length(12);
    },
  },
  {
    name: 'mutate() covers ===, +/-, &&/||, true/false, and the numeric literal',
    run: ({ mod, expect }) => {
      const { mutate } = getFns(mod);
      const sources = mutate(SCORE_SOURCE).map((m) => m.source);
      expect(sources.some((s) => s.includes('a !== b'))).to.equal(true);
      expect(sources.some((s) => s.includes('total - 10'))).to.equal(true);
      expect(sources.some((s) => s.includes('total + 5'))).to.equal(true);
      expect(sources.some((s) => s.includes('a >= 0 || b >= 0'))).to.equal(true);
      expect(sources.some((s) => s.includes('ok && false'))).to.equal(true);
      expect(sources.some((s) => s.includes('ok || true'))).to.equal(true);
      expect(sources.some((s) => s.includes('total + 11'))).to.equal(true);
    },
  },
  {
    name: 'mutate() applies the return-value mutator only when there is exactly one return statement',
    run: ({ mod, expect }) => {
      const { mutate } = getFns(mod);
      const scoreMutants = mutate(SCORE_SOURCE);
      expect(scoreMutants.some((m) => m.source.includes('return undefined;'))).to.equal(true);

      // classify() has three return statements, so the return-value mutator should not fire at all.
      const classifyMutants = mutate(CLASSIFY_SOURCE);
      expect(classifyMutants.some((m) => m.source.includes('return undefined;'))).to.equal(false);
    },
  },
  {
    name: 'mutate() produces exactly the two comparison mutants for classify()',
    run: ({ mod, expect }) => {
      const { mutate } = getFns(mod);
      const mutants = mutate(CLASSIFY_SOURCE);
      expect(mutants).to.have.length(2);
      expect(mutants.some((m) => m.source.includes("if (n <= low) return 'low';"))).to.equal(true);
      expect(mutants.some((m) => m.source.includes("if (n >= high) return 'high';"))).to.equal(true);
    },
  },
  {
    name: 'mutationScore: a weak test set (no boundary cases) kills nothing',
    run: ({ mod, expect }) => {
      const { mutationScore } = getFns(mod);
      const weak = [
        (fn: (n: number, l: number, h: number) => string) => fn(5, 0, 10) === 'mid',
        (fn: (n: number, l: number, h: number) => string) => fn(-5, 0, 10) === 'low',
        (fn: (n: number, l: number, h: number) => string) => fn(15, 0, 10) === 'high',
      ];
      const result = mutationScore(CLASSIFY_SOURCE, weak);
      expect(result.total).to.equal(2);
      expect(result.killed).to.equal(0);
      expect(result.score).to.equal(0);
      expect(result.survived).to.have.length(2);
    },
  },
  {
    name: 'mutationScore: adding boundary cases (n === low, n === high) kills both mutants — score 100',
    run: ({ mod, expect }) => {
      const { mutationScore } = getFns(mod);
      const strong = [
        (fn: (n: number, l: number, h: number) => string) => fn(5, 0, 10) === 'mid',
        (fn: (n: number, l: number, h: number) => string) => fn(-5, 0, 10) === 'low',
        (fn: (n: number, l: number, h: number) => string) => fn(15, 0, 10) === 'high',
        (fn: (n: number, l: number, h: number) => string) => fn(0, 0, 10) === 'mid',
        (fn: (n: number, l: number, h: number) => string) => fn(10, 0, 10) === 'mid',
      ];
      const result = mutationScore(CLASSIFY_SOURCE, strong);
      expect(result.total).to.equal(2);
      expect(result.killed).to.equal(2);
      expect(result.score).to.equal(100);
      expect(result.survived).to.have.length(0);
    },
  },
  {
    name: 'refactorPlan: missing characterization tests puts writing them as the first step',
    run: ({ mod, expect }) => {
      const { refactorPlan } = getFns(mod);
      const plan = refactorPlan({
        kind: 'rename',
        filesTouched: 3,
        hasCharacterizationTests: false,
        visualSurface: false,
        behindFlag: false,
      });
      expect(plan.steps[0]?.toLowerCase()).to.match(/characterization/);
    },
  },
  {
    name: 'refactorPlan: existing characterization tests means no such step is added',
    run: ({ mod, expect }) => {
      const { refactorPlan } = getFns(mod);
      const plan = refactorPlan({
        kind: 'extract',
        filesTouched: 3,
        hasCharacterizationTests: true,
        visualSurface: false,
        behindFlag: false,
      });
      expect(plan.steps.some((s) => /characterization/i.test(s))).to.equal(false);
    },
  },
  {
    name: 'refactorPlan: more than 20 files touched adds a chunking step; a visual surface adds a visual regression gate',
    run: ({ mod, expect }) => {
      const { refactorPlan } = getFns(mod);
      const plan = refactorPlan({
        kind: 'codemod',
        filesTouched: 25,
        hasCharacterizationTests: true,
        visualSurface: true,
        behindFlag: false,
      });
      expect(plan.steps.some((s) => /split|chunk/i.test(s))).to.equal(true);
      expect(plan.gates.some((g) => /visual/i.test(g))).to.equal(true);
      expect(plan.gates).to.include('typecheck');
      expect(plan.gates).to.include('tests');
    },
  },
  {
    name: 'refactorPlan: migrate-api without a flag adds a feature-flag step; behind a flag it does not',
    run: ({ mod, expect }) => {
      const { refactorPlan } = getFns(mod);
      const noFlag = refactorPlan({
        kind: 'migrate-api',
        filesTouched: 5,
        hasCharacterizationTests: true,
        visualSurface: false,
        behindFlag: false,
      });
      expect(noFlag.steps.some((s) => /flag/i.test(s))).to.equal(true);

      const withFlag = refactorPlan({
        kind: 'migrate-api',
        filesTouched: 5,
        hasCharacterizationTests: true,
        visualSurface: false,
        behindFlag: true,
      });
      expect(withFlag.steps.some((s) => /flag/i.test(s))).to.equal(false);
    },
  },
  {
    name: 'refactorPlan: compiler-enable adds a DevTools/memo/profiling gate',
    run: ({ mod, expect }) => {
      const { refactorPlan } = getFns(mod);
      const plan = refactorPlan({
        kind: 'compiler-enable',
        filesTouched: 4,
        hasCharacterizationTests: true,
        visualSurface: false,
        behindFlag: false,
      });
      expect(plan.gates.some((g) => /devtools|memo|profil/i.test(g))).to.equal(true);
    },
  },
];
