# Review your submission

You're on the other side now: implement the rubric from the first concept step as code, so
you can run it against your own submission before you send it.

## `reviewSubmission(s: Submission): Review`

```ts
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
```

Start `score` at `50` and apply, in this order:

**Blockers** (each pushes a message onto `blockers` and costs points):
- `tests.unit + tests.integration === 0` -> `"No tests at all"`, `score -= 30`.
- `!readme.run || !readme.test` -> `"README is missing how to run it or how to test it"`,
  `score -= 20`.

**Scope honesty.** Let `notDoneCount = readme.notDone?.length ?? 0` and
`undocumentedGaps = max(0, featuresPlanned - featuresDone - notDoneCount)`. Each undocumented
gap costs `10` points (`score -= undocumentedGaps * 10`) -- but gaps the README lists under
`notDone` cost nothing; if `notDoneCount > 0`, push `"Explains what was cut and why"` onto
`strengths`.

**Seniority signals**, each `+8` if true, each pushing a matching string onto `strengths`:
`migrations`, `validation`, `timeouts`, `indexesForQueries`.

**CI signals**, each `+6` if true, each pushing a matching string onto `strengths`:
`ci.runsTests`, `ci.runsVet`, `ci.runsTypecheck`, `ci.pinnedBySha`.

**Suggestions** (informational, no score effect): if `commits.length === 1 &&
commits[0].files > 30`, push a message about splitting the giant commit onto `suggestions`.

**Secrets, last.** If `secretsCommitted`, push `"Secrets committed to the repo"` onto the
*front* of `blockers`, and cap the score: `score = Math.min(score, 30)`.

Finally clamp `score` to `[0, 100]`.

## `timebox(totalHours: number): Array<{ phase: string; minutes: number }>`

Split `totalHours * 60` minutes into four phases, in this order, matching the split from the
first concept step:

| phase | share |
|---|---|
| plan | 10% |
| core implementation | 55% |
| tests | 15% |
| README, CI, and cleanup | 20% |

Round the first three phases to the nearest 5 minutes; make the last phase absorb whatever's
left, so the four numbers always sum back to `totalHours * 60` exactly (they will, since
every input this exercise is checked against is a whole number of hours).

## `SubmissionReview`

Already wired up in the starter -- it calls `reviewSubmission` and renders the score, and,
when there are blockers, an alert region (`role="alert"`) listing them. Once your two
functions are correct, it renders correctly with no further changes.
