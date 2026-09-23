import type { Check } from '../../../types';

type Submission = {
  readme: { run?: string; test?: string; decisions?: string[]; notDone?: string[] };
  commits: Array<{ message: string; files: number }>;
  tests: { unit: number; integration: number };
  ci: { runsTests: boolean; runsVet: boolean; runsTypecheck: boolean; pinnedBySha: boolean };
  secretsCommitted: boolean;
  migrations: boolean;
  validation: boolean;
  timeouts: boolean;
  indexesForQueries: boolean;
  featuresPlanned: number;
  featuresDone: number;
};

type Review = { score: number; blockers: string[]; strengths: string[]; suggestions: string[] };

const strongSubmission: Submission = {
  readme: {
    run: 'docker compose up -d && go run ./cmd/api',
    test: 'go test ./...',
    decisions: ['DFS for cycles, not a SQL constraint'],
    notDone: ['No status-update endpoint'],
  },
  commits: [
    { message: 'schema + store', files: 4 },
    { message: 'handlers', files: 3 },
    { message: 'tests + README', files: 5 },
  ],
  tests: { unit: 12, integration: 4 },
  ci: { runsTests: true, runsVet: true, runsTypecheck: true, pinnedBySha: true },
  secretsCommitted: false,
  migrations: true,
  validation: true,
  timeouts: true,
  indexesForQueries: true,
  featuresPlanned: 6,
  featuresDone: 5,
};

const weakSubmission: Submission = {
  readme: {},
  commits: [{ message: 'everything', files: 45 }],
  tests: { unit: 0, integration: 0 },
  ci: { runsTests: false, runsVet: false, runsTypecheck: false, pinnedBySha: false },
  secretsCommitted: true,
  migrations: false,
  validation: false,
  timeouts: false,
  indexesForQueries: false,
  featuresPlanned: 5,
  featuresDone: 2,
};

const cutScopeHonestlySubmission: Submission = {
  readme: {
    run: 'docker compose up -d && go run ./cmd/api',
    test: 'go test ./...',
    decisions: ['Cut auth to focus on the task graph'],
    notDone: ['No auth', 'No pagination on task list'],
  },
  commits: [
    { message: 'schema', files: 2 },
    { message: 'store', files: 2 },
    { message: 'handlers + tests', files: 6 },
    { message: 'README', files: 1 },
  ],
  tests: { unit: 6, integration: 1 },
  ci: { runsTests: true, runsVet: true, runsTypecheck: false, pinnedBySha: false },
  secretsCommitted: false,
  migrations: true,
  validation: true,
  timeouts: false,
  indexesForQueries: true,
  featuresPlanned: 6,
  featuresDone: 4,
};

export const checks: Check[] = [
  {
    name: 'reviewSubmission scores a strong, fully-documented submission highly with no blockers',
    run: async ({ mod, expect }) => {
      const reviewSubmission = mod.reviewSubmission as (s: Submission) => Review;
      const review = reviewSubmission(strongSubmission);
      expect(review.score).to.be.within(90, 100);
      expect(review.blockers).to.have.lengthOf(0);
      expect(review.strengths.length).to.be.greaterThan(5);
    },
  },
  {
    name: 'reviewSubmission blocks and caps the score when secrets are committed, even with everything else missing',
    run: async ({ mod, expect }) => {
      const reviewSubmission = mod.reviewSubmission as (s: Submission) => Review;
      const review = reviewSubmission(weakSubmission);
      expect(review.score).to.equal(0);
      expect(review.blockers.length).to.be.greaterThan(1);
      expect(review.blockers.some((b) => /secret/i.test(b))).to.equal(true);
      expect(review.blockers.some((b) => /test/i.test(b))).to.equal(true);
      expect(review.suggestions.some((s) => /commit/i.test(s))).to.equal(true);
    },
  },
  {
    name: 'reviewSubmission gives a scoped-down but honest submission a solid score with no blockers',
    run: async ({ mod, expect }) => {
      const reviewSubmission = mod.reviewSubmission as (s: Submission) => Review;
      const review = reviewSubmission(cutScopeHonestlySubmission);
      expect(review.blockers).to.have.lengthOf(0);
      expect(review.score).to.be.within(65, 95);
    },
  },
  {
    name: 'reviewSubmission does not penalize a gap the README names under notDone, but does penalize the same gap left unmentioned',
    run: async ({ mod, expect }) => {
      const reviewSubmission = mod.reviewSubmission as (s: Submission) => Review;
      const base: Submission = { ...strongSubmission, featuresPlanned: 5, featuresDone: 3 };
      const documented = reviewSubmission({ ...base, readme: { ...base.readme, notDone: ['Feature A', 'Feature B'] } });
      const undocumented = reviewSubmission({ ...base, readme: { ...base.readme, notDone: [] } });
      expect(documented.score).to.be.greaterThan(undocumented.score);
    },
  },
  {
    name: 'timebox splits 4 hours into 4 phases that are each a multiple of 5 minutes and sum to the total',
    run: async ({ mod, expect }) => {
      const timebox = mod.timebox as (h: number) => Array<{ phase: string; minutes: number }>;
      const phases = timebox(4);
      expect(phases).to.have.lengthOf(4);
      const total = phases.reduce((sum, p) => sum + p.minutes, 0);
      expect(total).to.equal(240);
      for (const p of phases) {
        expect(p.minutes % 5).to.equal(0);
      }
      // Roughly plan 10% / core 55% / tests 15% / cleanup 20%, in that order.
      expect(phases[0]!.minutes).to.be.within(15, 35);
      expect(phases[1]!.minutes).to.be.within(120, 145);
      expect(phases[2]!.minutes).to.be.within(25, 45);
      expect(phases[3]!.minutes).to.be.within(35, 60);
    },
  },
  {
    name: 'timebox still sums exactly for a longer total',
    run: async ({ mod, expect }) => {
      const timebox = mod.timebox as (h: number) => Array<{ phase: string; minutes: number }>;
      const phases = timebox(8);
      const total = phases.reduce((sum, p) => sum + p.minutes, 0);
      expect(total).to.equal(480);
      for (const p of phases) {
        expect(p.minutes % 5).to.equal(0);
        expect(p.minutes).to.be.greaterThan(0);
      }
    },
  },
  {
    name: 'SubmissionReview renders an alert listing blockers for a submission that has them',
    run: async ({ mod, render, screen, expect }) => {
      const SubmissionReview = mod.SubmissionReview as React.ComponentType<{ submission: Submission }>;
      render(<SubmissionReview submission={weakSubmission} />);
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).to.match(/secret/i);
    },
  },
  {
    name: 'SubmissionReview renders no alert for a submission with no blockers',
    run: async ({ mod, render, screen, expect }) => {
      const SubmissionReview = mod.SubmissionReview as React.ComponentType<{ submission: Submission }>;
      render(<SubmissionReview submission={strongSubmission} />);
      expect(screen.queryByRole('alert')).to.equal(null);
    },
  },
];
