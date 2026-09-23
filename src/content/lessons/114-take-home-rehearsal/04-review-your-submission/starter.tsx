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

// TODO: implement the rubric described in the prompt.
export function reviewSubmission(s: Submission): Review {
  return { score: 0, blockers: [], strengths: [], suggestions: [] };
}

// TODO: split totalHours into plan/core/tests/cleanup minutes, rounded to
// the nearest 5, summing back to totalHours * 60 exactly.
export function timebox(totalHours: number): Array<{ phase: string; minutes: number }> {
  return [];
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
