import type { Check } from '../../../types';

type TaskKind =
  | 'boilerplate'
  | 'migration'
  | 'refactor'
  | 'bugfix'
  | 'feature'
  | 'architecture'
  | 'security'
  | 'incident';

type Task = {
  kind: TaskKind;
  hasTests: boolean;
  specClarity: 'clear' | 'vague';
  blastRadius: 'file' | 'module' | 'system';
  sensitivity: 'low' | 'high';
};

type Mode = 'delegate' | 'pair' | 'manual';
type Triage = { mode: Mode; guardrails: string[]; reason: string };

type Diff = {
  filesChanged: number;
  addedDeps: string[];
  testsModified: boolean;
  testsAdded: boolean;
  touchesAuthOrPayments: boolean;
};

type Mod = {
  triageTask: (task: Task) => Triage;
  reviewChecklist: (diff: Diff) => string[];
};

const baseTask: Task = {
  kind: 'boilerplate',
  hasTests: true,
  specClarity: 'clear',
  blastRadius: 'file',
  sensitivity: 'low',
};

export const checks: Check[] = [
  {
    name: 'a clean boilerplate task (tests, clear spec, low sensitivity, small blast radius) is delegated',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      const result = triageTask(baseTask);
      expect(result.mode).to.equal('delegate');
      expect(result.guardrails).to.include('run typecheck and tests in the loop');
    },
  },
  {
    name: 'the same clean profile on a migration or refactor also delegates; a bugfix or feature does not',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      expect(triageTask({ ...baseTask, kind: 'migration' }).mode).to.equal('delegate');
      expect(triageTask({ ...baseTask, kind: 'refactor' }).mode).to.equal('delegate');
      expect(triageTask({ ...baseTask, kind: 'bugfix' }).mode).to.not.equal('delegate');
      expect(triageTask({ ...baseTask, kind: 'feature' }).mode).to.not.equal('delegate');
    },
  },
  {
    name: 'architecture work is always manual, regardless of how clean the rest of the profile is',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      const result = triageTask({ ...baseTask, kind: 'architecture' });
      expect(result.mode).to.equal('manual');
      expect(result.guardrails).to.include('treat the agent output as one proposal, not the decision');
      expect(result.reason.toLowerCase()).to.include('architecture');
    },
  },
  {
    name: 'security work and high-sensitivity work both rule out delegating, even with tests and a clear spec',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      const securityResult = triageTask({ ...baseTask, kind: 'security' });
      expect(securityResult.mode).to.not.equal('delegate');
      expect(securityResult.guardrails).to.include('require a second human reviewer before merge');

      const sensitiveResult = triageTask({ ...baseTask, sensitivity: 'high' });
      expect(sensitiveResult.mode).to.not.equal('delegate');
      expect(sensitiveResult.guardrails).to.include('require a second human reviewer before merge');
    },
  },
  {
    name: 'incidents and vague specs both rule out delegating and add their own guardrail',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      const incident = triageTask({ ...baseTask, kind: 'incident' });
      expect(incident.mode).to.not.equal('delegate');
      expect(incident.guardrails.some((g) => /investigat|evidence/i.test(g))).to.equal(true);

      const vague = triageTask({ ...baseTask, specClarity: 'vague' });
      expect(vague.mode).to.not.equal('delegate');
      expect(vague.guardrails).to.include('write a spec first');
      expect(vague.reason.toLowerCase()).to.include('spec');
    },
  },
  {
    name: 'missing tests always adds a characterization-test guardrail, even on an otherwise clean task',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      const result = triageTask({ ...baseTask, hasTests: false });
      expect(result.guardrails).to.include('add characterization tests before changes');
      // failing tests rules out the "clean profile" delegate case too
      expect(result.mode).to.not.equal('delegate');
    },
  },
  {
    name: 'blast radius: system rules out delegating with a small-diffs guardrail; module adds a review guardrail but can still delegate',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { triageTask } = mod as unknown as Mod;

      const system = triageTask({ ...baseTask, blastRadius: 'system' });
      expect(system.mode).to.not.equal('delegate');
      expect(system.guardrails).to.include('small reviewable diffs');

      const module_ = triageTask({ ...baseTask, blastRadius: 'module' });
      expect(module_.guardrails).to.include('review the diff module by module, not only the end result');
      expect(module_.mode).to.equal('delegate');
    },
  },
  {
    name: 'reviewChecklist: auth/payments and a large diff both surface, in that order, ahead of dependency audits',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { reviewChecklist } = mod as unknown as Mod;

      const items = reviewChecklist({
        filesChanged: 20,
        addedDeps: ['left-pad', 'is-odd'],
        testsModified: false,
        testsAdded: false,
        touchesAuthOrPayments: true,
      });

      expect(items[0]).to.equal('get a second reviewer for auth or payments code');
      expect(items[1]).to.equal('ask for a split');
      expect(items[2]).to.equal('audit new dependency "left-pad" (lesson 68)');
      expect(items[3]).to.equal('audit new dependency "is-odd" (lesson 68)');
      expect(items[items.length - 1]).to.equal('read the diff line by line before approving');
    },
  },
  {
    name: 'reviewChecklist: tests modified without tests added is flagged; tests added is not',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { reviewChecklist } = mod as unknown as Mod;

      const weakened = reviewChecklist({
        filesChanged: 1,
        addedDeps: [],
        testsModified: true,
        testsAdded: false,
        touchesAuthOrPayments: false,
      });
      expect(weakened).to.include('verify tests were not weakened to pass');

      const strengthened = reviewChecklist({
        filesChanged: 1,
        addedDeps: [],
        testsModified: true,
        testsAdded: true,
        touchesAuthOrPayments: false,
      });
      expect(strengthened).to.not.include('verify tests were not weakened to pass');
    },
  },
  {
    name: 'reviewChecklist: a small, dependency-free, test-covered diff still always ends with the read-it-yourself item',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { reviewChecklist } = mod as unknown as Mod;

      const items = reviewChecklist({
        filesChanged: 1,
        addedDeps: [],
        testsModified: false,
        testsAdded: true,
        touchesAuthOrPayments: false,
      });

      expect(items).to.deep.equal(['read the diff line by line before approving']);
    },
  },
];
