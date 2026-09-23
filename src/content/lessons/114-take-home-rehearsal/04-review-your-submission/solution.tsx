export type Submission = {
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

export type Review = { score: number; blockers: string[]; strengths: string[]; suggestions: string[] };

/**
 * Rubric:
 * - base score 50
 * - no tests at all: blocker, -30
 * - README missing run or test instructions: blocker, -20
 * - each undocumented gap (planned but neither done nor listed under notDone): -10
 * - notDone listing something at all: strength ("explains what was cut")
 * - migrations / validation / timeouts / indexesForQueries: +8 each, strength each
 * - ci.runsTests / runsVet / runsTypecheck / pinnedBySha: +6 each, strength each
 * - a single commit touching >30 files: suggestion, no score effect
 * - secrets committed: blocker (pushed first), caps score at 30
 * - final score clamped to [0, 100]
 */
export function reviewSubmission(s: Submission): Review {
  const blockers: string[] = [];
  const strengths: string[] = [];
  const suggestions: string[] = [];
  let score = 50;

  const totalTests = s.tests.unit + s.tests.integration;
  if (totalTests === 0) {
    blockers.push('No tests at all');
    score -= 30;
  }
  if (!s.readme.run || !s.readme.test) {
    blockers.push('README is missing how to run it or how to test it');
    score -= 20;
  }

  const notDoneCount = s.readme.notDone?.length ?? 0;
  const undocumentedGaps = Math.max(0, s.featuresPlanned - s.featuresDone - notDoneCount);
  if (undocumentedGaps > 0) {
    score -= undocumentedGaps * 10;
  }
  if (notDoneCount > 0) {
    strengths.push('Explains what was cut and why');
  }

  if (s.migrations) {
    strengths.push('Uses a migration instead of an inline CREATE TABLE');
    score += 8;
  }
  if (s.validation) {
    strengths.push('Validates input at the API boundary');
    score += 8;
  }
  if (s.timeouts) {
    strengths.push('Uses context and timeouts on request paths');
    score += 8;
  }
  if (s.indexesForQueries) {
    strengths.push('Adds an index for the query it actually runs');
    score += 8;
  }

  if (s.ci.runsTests) {
    strengths.push('CI runs the test suite');
    score += 6;
  }
  if (s.ci.runsVet) {
    strengths.push('CI runs go vet');
    score += 6;
  }
  if (s.ci.runsTypecheck) {
    strengths.push('CI runs the frontend typecheck');
    score += 6;
  }
  if (s.ci.pinnedBySha) {
    strengths.push('CI actions are pinned by commit SHA');
    score += 6;
  }

  if (s.commits.length === 1 && s.commits[0]!.files > 30) {
    suggestions.push('One giant commit -- split it into reviewable pieces');
  }

  if (s.secretsCommitted) {
    blockers.unshift('Secrets committed to the repo');
    score = Math.min(score, 30);
  }

  score = Math.max(0, Math.min(100, score));

  return { score, blockers, strengths, suggestions };
}

const TIMEBOX_SPLIT = [
  { phase: 'Plan', pct: 0.1 },
  { phase: 'Core implementation', pct: 0.55 },
  { phase: 'Tests', pct: 0.15 },
] as const;

export function timebox(totalHours: number): Array<{ phase: string; minutes: number }> {
  const totalMinutes = totalHours * 60;
  const roundTo5 = (n: number) => Math.round(n / 5) * 5;

  const result: Array<{ phase: string; minutes: number }> = [];
  let allocated = 0;
  for (const { phase, pct } of TIMEBOX_SPLIT) {
    const minutes = roundTo5(totalMinutes * pct);
    result.push({ phase, minutes });
    allocated += minutes;
  }
  result.push({ phase: 'README, CI, and cleanup', minutes: totalMinutes - allocated });
  return result;
}

export function SubmissionReview({ submission }: { submission: Submission }) {
  const review = reviewSubmission(submission);

  return (
    <section>
      <p>
        Score: {review.score} / 100
      </p>
      {review.blockers.length > 0 && (
        <div role="alert">
          <p>Blockers</p>
          <ul>
            {review.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {review.strengths.length > 0 && (
        <div>
          <p>Strengths</p>
          <ul>
            {review.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {review.suggestions.length > 0 && (
        <div>
          <p>Suggestions</p>
          <ul>
            {review.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const sampleSubmission: Submission = {
  readme: {
    run: 'docker compose up -d && go run ./cmd/api',
    test: 'go test ./...',
    decisions: ['Cycle detection is DFS in Go, not a SQL constraint'],
    notDone: ['No status-update endpoint'],
  },
  commits: [
    { message: 'schema + store', files: 4 },
    { message: 'handlers', files: 3 },
    { message: 'tests + README', files: 5 },
  ],
  tests: { unit: 9, integration: 3 },
  ci: { runsTests: true, runsVet: true, runsTypecheck: true, pinnedBySha: true },
  secretsCommitted: false,
  migrations: true,
  validation: true,
  timeouts: true,
  indexesForQueries: true,
  featuresPlanned: 5,
  featuresDone: 4,
};

export default function App() {
  return <SubmissionReview submission={sampleSubmission} />;
}
