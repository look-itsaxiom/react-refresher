import type { Check } from '../../../types';

type RSCSupport = 'stable' | 'unstable' | 'none';

type FrameworkProfile = {
  name: string;
  rsc: RSCSupport;
  ssg: boolean;
  edge: boolean;
  typedRoutes: boolean;
  vendorNeutral: boolean;
  maturity: number;
  learningCurve: number;
};

type CriterionKey =
  | 'rsc'
  | 'ssg'
  | 'edge'
  | 'typedRoutes'
  | 'vendorNeutral'
  | 'maturity'
  | 'learningCurve';

type Weights = Partial<Record<CriterionKey, number>>;

type HardConstraints = {
  rsc?: RSCSupport[];
  ssg?: boolean;
  edge?: boolean;
  typedRoutes?: boolean;
  vendorNeutral?: boolean;
  minMaturity?: number;
  maxLearningCurve?: number;
};

type Requirements = { weights: Weights; hardConstraints?: HardConstraints };

type ScoredFramework = { name: string; score: number; contributions: Partial<Record<CriterionKey, number>> };
type Elimination = { name: string; reasons: string[] };
type ScoreOutcome = { ranked: ScoredFramework[]; eliminated: Elimination[] };

type Mod = {
  scoreFrameworks: (requirements: Requirements, catalog: FrameworkProfile[]) => ScoreOutcome;
};

const catalog: FrameworkProfile[] = [
  { name: 'Next.js', rsc: 'stable', ssg: true, edge: true, typedRoutes: true, vendorNeutral: false, maturity: 5, learningCurve: 4 },
  { name: 'React Router', rsc: 'unstable', ssg: true, edge: true, typedRoutes: true, vendorNeutral: true, maturity: 4, learningCurve: 3 },
  { name: 'TanStack Start', rsc: 'none', ssg: true, edge: true, typedRoutes: true, vendorNeutral: true, maturity: 2, learningCurve: 3 },
  { name: 'Astro', rsc: 'none', ssg: true, edge: true, typedRoutes: false, vendorNeutral: true, maturity: 5, learningCurve: 2 },
];

export const checks: Check[] = [
  {
    name: 'ranks frameworks descending by weighted score, with per-criterion contributions',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { scoreFrameworks } = mod as unknown as Mod;

      const result = scoreFrameworks(
        { weights: { rsc: 3, typedRoutes: 2, vendorNeutral: 2, maturity: 1 } },
        catalog,
      );

      expect(result.eliminated).to.have.length(0);
      expect(result.ranked.map((r) => r.name)).to.deep.equal([
        'React Router',
        'Next.js',
        'TanStack Start',
        'Astro',
      ]);

      const reactRouter = result.ranked.find((r) => r.name === 'React Router')!;
      expect(reactRouter.score).to.be.closeTo(6.25, 1e-6);

      const nextjs = result.ranked.find((r) => r.name === 'Next.js')!;
      expect(nextjs.score).to.be.closeTo(6, 1e-6);
      expect(nextjs.contributions.rsc).to.be.closeTo(3, 1e-6);
      expect(nextjs.contributions.vendorNeutral).to.be.closeTo(0, 1e-6);
      expect(nextjs.contributions.maturity).to.be.closeTo(1, 1e-6);
    },
  },
  {
    name: 'contributions only include criteria present in the weights, not every field',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { scoreFrameworks } = mod as unknown as Mod;

      const result = scoreFrameworks({ weights: { edge: 5 } }, catalog);
      const nextjs = result.ranked.find((r) => r.name === 'Next.js')!;

      expect(Object.keys(nextjs.contributions)).to.deep.equal(['edge']);
      expect(nextjs.score).to.be.closeTo(5, 1e-6);
    },
  },
  {
    name: 'eliminates frameworks that fail a hard constraint and excludes them from ranked, with a readable reason',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { scoreFrameworks } = mod as unknown as Mod;

      const result = scoreFrameworks(
        {
          weights: { learningCurve: 1, maturity: 1 },
          hardConstraints: { vendorNeutral: true, minMaturity: 3 },
        },
        catalog,
      );

      const eliminatedNames = result.eliminated.map((e) => e.name).sort();
      expect(eliminatedNames).to.deep.equal(['Next.js', 'TanStack Start']);
      expect(result.ranked.map((r) => r.name)).to.not.include('Next.js');
      expect(result.ranked.map((r) => r.name)).to.not.include('TanStack Start');

      const nextjsReasons = result.eliminated.find((e) => e.name === 'Next.js')!.reasons;
      expect(nextjsReasons.some((r) => /vendorneutral/i.test(r))).to.equal(true);

      const tanstackReasons = result.eliminated.find((e) => e.name === 'TanStack Start')!.reasons;
      expect(tanstackReasons.some((r) => r.includes('2') && r.includes('3'))).to.equal(true);

      // survivors ranked correctly: Astro (1.75) beats React Router (1.25)
      expect(result.ranked.map((r) => r.name)).to.deep.equal(['Astro', 'React Router']);
    },
  },
  {
    name: 'a framework failing multiple hard constraints collects a reason for each one',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { scoreFrameworks } = mod as unknown as Mod;

      const result = scoreFrameworks(
        { weights: {}, hardConstraints: { rsc: ['stable'], maxLearningCurve: 2 } },
        catalog,
      );

      const reactRouter = result.eliminated.find((e) => e.name === 'React Router');
      expect(reactRouter, 'React Router fails both rsc and maxLearningCurve').to.not.equal(undefined);
      expect(reactRouter!.reasons.length).to.be.at.least(2);
      expect(reactRouter!.reasons.some((r) => /rsc/i.test(r))).to.equal(true);
      expect(reactRouter!.reasons.some((r) => /learningcurve/i.test(r))).to.equal(true);
    },
  },
  {
    name: 'ties in score are broken by name, ascending',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { scoreFrameworks } = mod as unknown as Mod;

      const tiedCatalog: FrameworkProfile[] = [
        { name: 'Zeta', rsc: 'none', ssg: true, edge: false, typedRoutes: false, vendorNeutral: false, maturity: 1, learningCurve: 5 },
        { name: 'Alpha', rsc: 'none', ssg: true, edge: false, typedRoutes: false, vendorNeutral: false, maturity: 1, learningCurve: 5 },
      ];

      const result = scoreFrameworks({ weights: { ssg: 1 } }, tiedCatalog);
      expect(result.ranked.map((r) => r.name)).to.deep.equal(['Alpha', 'Zeta']);
    },
  },
];
