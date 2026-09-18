export type Task = { goal: string; changedFiles: string[]; keywords: string[] };
export type RepoFile = { path: string; tokens: number; kind: 'spec' | 'test' | 'source' | 'doc' | 'lock' | 'generated' };
export type PlanResult = {
  include: string[];
  excluded: Array<{ path: string; reason: string }>;
  totalTokens: number;
  notes: string[];
};

/** chars ÷ 4, rounded up — a rough approximation, not real tokenization. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function containsKeyword(path: string, keywords: string[]): boolean {
  const lower = path.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

/** The test file a source file would pair with, or the source file a test file would pair with. */
function testCounterparts(path: string): string[] {
  const testMatch = /^(.*)\.test\.(tsx?|jsx?)$/.exec(path);
  if (testMatch) return [`${testMatch[1]}.${testMatch[2]}`];
  const sourceMatch = /^(.*)\.(tsx?|jsx?)$/.exec(path);
  if (sourceMatch) return [`${sourceMatch[1]}.test.${sourceMatch[2]}`];
  return [];
}

/**
 * Priority order: (1) spec files mentioning a task keyword, (2) the task's changed files,
 * (3) those files' tests by naming convention, (4) docs mentioning a keyword, (5) other
 * source files by keyword hits. Lockfiles and generated files are never included. Once a
 * candidate's tokens don't fit the remaining budget it's excluded as 'over-budget', but
 * later, smaller candidates are still tried (this is a greedy best-fit, not a hard stop).
 */
export function planContext(task: Task, repo: RepoFile[], budget: number): PlanResult {
  const byPath = new Map(repo.map((f) => [f.path, f] as const));
  const handled = new Set<string>();
  const include: string[] = [];
  const excluded: Array<{ path: string; reason: string }> = [];
  const notes: string[] = [];
  let totalTokens = 0;
  let needsSummaryNote = false;

  function tryAdd(file: RepoFile, isRequiredTier: boolean): void {
    if (handled.has(file.path)) return;
    handled.add(file.path);

    if (file.kind === 'lock' || file.kind === 'generated') {
      excluded.push({ path: file.path, reason: 'never-include' });
      return;
    }
    if (isRequiredTier && file.tokens > budget * 0.4) {
      needsSummaryNote = true;
    }
    if (file.tokens <= budget - totalTokens) {
      include.push(file.path);
      totalTokens += file.tokens;
    } else {
      excluded.push({ path: file.path, reason: 'over-budget' });
    }
  }

  for (const file of repo) {
    if (file.kind === 'spec' && containsKeyword(file.path, task.keywords)) tryAdd(file, true);
  }

  const changedIncluded: string[] = [];
  for (const path of task.changedFiles) {
    const file = byPath.get(path);
    if (!file) continue;
    tryAdd(file, true);
    changedIncluded.push(path);
  }

  for (const path of changedIncluded) {
    for (const counterpart of testCounterparts(path)) {
      const file = byPath.get(counterpart);
      if (file) tryAdd(file, false);
    }
  }

  for (const file of repo) {
    if (file.kind === 'doc' && containsKeyword(file.path, task.keywords)) tryAdd(file, false);
  }

  for (const file of repo) {
    if (file.kind === 'source' && containsKeyword(file.path, task.keywords)) tryAdd(file, false);
  }

  if (needsSummaryNote) notes.push('ask for a summary instead');

  return { include, excluded, totalTokens, notes };
}

export type PullRequest = {
  spec: string[];
  implemented: string[];
  testsAdded: string[];
  testsChanged: string[];
  deps: string[];
  filesTouched: number;
  usesDeprecated: string[];
};
export type RubricResult = { score: number; blockers: string[]; questions: string[] };

const DEPRECATED_REPLACEMENT: Record<string, string> = {
  forwardRef: 'ref is a normal prop in React 19; drop forwardRef and accept ref directly.',
  propTypes: 'propTypes are no longer read from function components in React 19; use TypeScript prop types instead.',
  'ReactDOM.render': 'ReactDOM.render was removed in React 19; use createRoot from react-dom/client.',
};

export function reviewRubric(pr: PullRequest): RubricResult {
  const blockers: string[] = [];
  const questions: string[] = [];
  let score = 100;

  const implementedSet = new Set(pr.implemented);
  for (const item of pr.spec) {
    if (!implementedSet.has(item)) {
      blockers.push(`Spec item not implemented: "${item}"`);
      score -= 15;
    }
  }

  for (const api of pr.usesDeprecated) {
    const replacement = DEPRECATED_REPLACEMENT[api] ?? 'check the React 19 migration guide.';
    blockers.push(`Uses deprecated API "${api}": ${replacement}`);
    score -= 20;
  }

  if (pr.testsChanged.length > 0 && pr.testsAdded.length === 0) {
    questions.push('Tests were changed but none were added — were tests weakened, or was the old assertion actually wrong?');
    score -= 10;
  }

  for (const dep of pr.deps) {
    questions.push(`New dependency added: "${dep}" — was it necessary?`);
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, blockers, questions };
}

const SAMPLE_REPO: RepoFile[] = [
  { path: 'docs/specs/filter.md', tokens: 400, kind: 'spec' },
  { path: 'src/TodoList.tsx', tokens: 900, kind: 'source' },
  { path: 'src/TodoList.test.tsx', tokens: 500, kind: 'test' },
  { path: 'pnpm-lock.yaml', tokens: 50000, kind: 'lock' },
];

export default function App() {
  const plan = planContext({ goal: 'Add a status filter', changedFiles: ['src/TodoList.tsx'], keywords: ['filter'] }, SAMPLE_REPO, 2000);
  const review = reviewRubric({
    spec: ['filter by status', 'update count'],
    implemented: ['filter by status'],
    testsAdded: [],
    testsChanged: ['src/TodoList.test.tsx'],
    deps: [],
    filesTouched: 2,
    usesDeprecated: [],
  });
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Plan</h2>
      <pre>{JSON.stringify(plan, null, 2)}</pre>
      <h2>Review</h2>
      <pre>{JSON.stringify(review, null, 2)}</pre>
    </div>
  );
}
