import type { Check } from '../../../types';

type RepoFile = { path: string; tokens: number; kind: 'spec' | 'test' | 'source' | 'doc' | 'lock' | 'generated' };
type Task = { goal: string; changedFiles: string[]; keywords: string[] };
type PlanResult = { include: string[]; excluded: Array<{ path: string; reason: string }>; totalTokens: number; notes: string[] };
type PullRequest = {
  spec: string[];
  implemented: string[];
  testsAdded: string[];
  testsChanged: string[];
  deps: string[];
  filesTouched: number;
  usesDeprecated: string[];
};
type RubricResult = { score: number; blockers: string[]; questions: string[] };

export const checks: Check[] = [
  {
    name: 'estimateTokens: approximates chars/4 rounded up',
    run: async ({ mod, expect }) => {
      const estimateTokens = mod.estimateTokens as (text: string) => number;
      expect(estimateTokens('')).to.equal(0);
      expect(estimateTokens('abcd')).to.equal(1);
      expect(estimateTokens('abcde')).to.equal(2);
      expect(estimateTokens('a'.repeat(100))).to.equal(25);
    },
  },
  {
    name: 'planContext: never includes a lock or generated file, even when it is a changed file matching a keyword',
    run: async ({ mod, expect }) => {
      const planContext = mod.planContext as (task: Task, repo: RepoFile[], budget: number) => PlanResult;
      const repo: RepoFile[] = [
        { path: 'pnpm-lock.yaml', tokens: 100, kind: 'lock' },
        { path: 'dist/bundle.js', tokens: 100, kind: 'generated' },
      ];
      const result = planContext({ goal: 'x', changedFiles: ['pnpm-lock.yaml', 'dist/bundle.js'], keywords: ['bundle'] }, repo, 10000);
      expect(result.include).to.deep.equal([]);
      expect(result.totalTokens).to.equal(0);
      expect(result.excluded).to.have.lengthOf(2);
      expect(result.excluded.every((e) => e.reason === 'never-include')).to.equal(true);
    },
  },
  {
    name: 'planContext: prioritizes a keyword-matching spec file, then changed files, and keeps trying smaller candidates after one is over-budget',
    run: async ({ mod, expect }) => {
      const planContext = mod.planContext as (task: Task, repo: RepoFile[], budget: number) => PlanResult;
      const repo: RepoFile[] = [
        { path: 'docs/specs/filter.md', tokens: 300, kind: 'spec' },
        { path: 'src/Foo.tsx', tokens: 900, kind: 'source' },
        { path: 'src/Foo.test.tsx', tokens: 50, kind: 'test' },
      ];
      const result = planContext({ goal: 'x', changedFiles: ['src/Foo.tsx'], keywords: ['filter'] }, repo, 1000);
      expect(result.include).to.include('docs/specs/filter.md');
      expect(result.include).to.include('src/Foo.test.tsx');
      expect(result.include).to.not.include('src/Foo.tsx');
      expect(result.excluded).to.deep.include({ path: 'src/Foo.tsx', reason: 'over-budget' });
      expect(result.totalTokens).to.equal(350);
    },
  },
  {
    name: 'planContext: includes a changed file\'s test counterpart by naming convention, independent of keywords',
    run: async ({ mod, expect }) => {
      const planContext = mod.planContext as (task: Task, repo: RepoFile[], budget: number) => PlanResult;
      const repo: RepoFile[] = [
        { path: 'src/Bar.ts', tokens: 100, kind: 'source' },
        { path: 'src/Bar.test.ts', tokens: 80, kind: 'test' },
        { path: 'src/Unrelated.ts', tokens: 40, kind: 'source' },
      ];
      const result = planContext({ goal: 'x', changedFiles: ['src/Bar.ts'], keywords: ['no-match-here'] }, repo, 1000);
      expect(result.include).to.include('src/Bar.ts');
      expect(result.include).to.include('src/Bar.test.ts');
      expect(result.include).to.not.include('src/Unrelated.ts');
    },
  },
  {
    name: 'planContext: notes "ask for a summary instead" when a required (spec/changed) file exceeds 40% of budget, not when only an optional file does',
    run: async ({ mod, expect }) => {
      const planContext = mod.planContext as (task: Task, repo: RepoFile[], budget: number) => PlanResult;
      const bigSpecRepo: RepoFile[] = [{ path: 'docs/specs/big.md', tokens: 500, kind: 'spec' }];
      const withBigSpec = planContext({ goal: 'x', changedFiles: [], keywords: ['big'] }, bigSpecRepo, 1000);
      expect(withBigSpec.notes).to.include('ask for a summary instead');

      const bigDocRepo: RepoFile[] = [{ path: 'docs/big-notes.md', tokens: 500, kind: 'doc' }];
      const withBigDoc = planContext({ goal: 'x', changedFiles: [], keywords: ['big'] }, bigDocRepo, 1000);
      expect(withBigDoc.notes).to.not.include('ask for a summary instead');
    },
  },
  {
    name: 'reviewRubric: a spec item missing from implemented is a blocker that mentions it, and lowers the score',
    run: async ({ mod, expect }) => {
      const reviewRubric = mod.reviewRubric as (pr: PullRequest) => RubricResult;
      const pr: PullRequest = {
        spec: ['filter by status', 'update count'],
        implemented: ['filter by status'],
        testsAdded: ['t1'],
        testsChanged: [],
        deps: [],
        filesTouched: 2,
        usesDeprecated: [],
      };
      const result = reviewRubric(pr);
      expect(result.blockers).to.have.lengthOf(1);
      expect(result.blockers[0]!).to.include('update count');
      expect(result.score).to.be.lessThan(100);
    },
  },
  {
    name: 'reviewRubric: usesDeprecated produces a blocker per API naming its React 19 replacement (forwardRef, propTypes, ReactDOM.render)',
    run: async ({ mod, expect }) => {
      const reviewRubric = mod.reviewRubric as (pr: PullRequest) => RubricResult;
      const base: PullRequest = { spec: [], implemented: [], testsAdded: [], testsChanged: [], deps: [], filesTouched: 1, usesDeprecated: [] };

      const forwardRefResult = reviewRubric({ ...base, usesDeprecated: ['forwardRef'] });
      expect(forwardRefResult.blockers).to.have.lengthOf(1);
      expect(forwardRefResult.blockers[0]!.toLowerCase()).to.include('forwardref');

      const renderResult = reviewRubric({ ...base, usesDeprecated: ['ReactDOM.render'] });
      expect(renderResult.blockers[0]!.toLowerCase()).to.include('createroot');

      const propTypesResult = reviewRubric({ ...base, usesDeprecated: ['propTypes'] });
      expect(propTypesResult.blockers[0]!.toLowerCase()).to.include('typescript');
    },
  },
  {
    name: 'reviewRubric: testsChanged without testsAdded raises one weakened-tests question; adding tests too suppresses it',
    run: async ({ mod, expect }) => {
      const reviewRubric = mod.reviewRubric as (pr: PullRequest) => RubricResult;
      const base: PullRequest = { spec: [], implemented: [], testsAdded: [], testsChanged: [], deps: [], filesTouched: 1, usesDeprecated: [] };

      const weakened = reviewRubric({ ...base, testsChanged: ['a.test.ts', 'b.test.ts'] });
      expect(weakened.questions.filter((q) => q.toLowerCase().includes('weakened'))).to.have.lengthOf(1);

      const notWeakened = reviewRubric({ ...base, testsChanged: ['a.test.ts'], testsAdded: ['c.test.ts'] });
      expect(notWeakened.questions.filter((q) => q.toLowerCase().includes('weakened'))).to.have.lengthOf(0);
    },
  },
  {
    name: 'reviewRubric: every new dependency raises its own question',
    run: async ({ mod, expect }) => {
      const reviewRubric = mod.reviewRubric as (pr: PullRequest) => RubricResult;
      const result = reviewRubric({
        spec: [],
        implemented: [],
        testsAdded: [],
        testsChanged: [],
        deps: ['left-pad', 'moment'],
        filesTouched: 1,
        usesDeprecated: [],
      });
      expect(result.questions).to.have.lengthOf(2);
      expect(result.questions.some((q) => q.includes('left-pad'))).to.equal(true);
      expect(result.questions.some((q) => q.includes('moment'))).to.equal(true);
    },
  },
  {
    name: 'reviewRubric: a PR that fully implements its spec, adds no deprecated APIs, and adds no new deps scores 100 with no blockers or questions',
    run: async ({ mod, expect }) => {
      const reviewRubric = mod.reviewRubric as (pr: PullRequest) => RubricResult;
      const result = reviewRubric({
        spec: ['a', 'b'],
        implemented: ['a', 'b'],
        testsAdded: ['t1'],
        testsChanged: [],
        deps: [],
        filesTouched: 3,
        usesDeprecated: [],
      });
      expect(result).to.deep.equal({ score: 100, blockers: [], questions: [] });
    },
  },
];
