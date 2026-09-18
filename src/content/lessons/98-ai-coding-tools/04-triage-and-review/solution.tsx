export type TaskKind =
  | 'boilerplate'
  | 'migration'
  | 'refactor'
  | 'bugfix'
  | 'feature'
  | 'architecture'
  | 'security'
  | 'incident';

export type Task = {
  kind: TaskKind;
  hasTests: boolean;
  specClarity: 'clear' | 'vague';
  blastRadius: 'file' | 'module' | 'system';
  sensitivity: 'low' | 'high';
};

export type Mode = 'delegate' | 'pair' | 'manual';

export type Triage = { mode: Mode; guardrails: string[]; reason: string };

export function triageTask(task: Task): Triage {
  const guardrails: string[] = [];
  const reasons: string[] = [];
  let forceManual = false;
  let ruleOutDelegate = false;

  if (task.kind === 'architecture') {
    forceManual = true;
    ruleOutDelegate = true;
    reasons.push('architecture decisions need a human owner');
    guardrails.push('treat the agent output as one proposal, not the decision');
  }

  if (task.kind === 'security' || task.sensitivity === 'high') {
    ruleOutDelegate = true;
    reasons.push('security-sensitive work needs review before it merges');
    guardrails.push('require a second human reviewer before merge');
  }

  if (task.kind === 'incident') {
    ruleOutDelegate = true;
    reasons.push('incidents need a human deciding the fix while the agent investigates');
    guardrails.push('use the agent to gather evidence (logs, diffs, timelines), not to ship the fix unattended');
  }

  if (task.specClarity === 'vague') {
    ruleOutDelegate = true;
    reasons.push('a vague spec needs to become a clear one before delegating');
    guardrails.push('write a spec first');
  }

  if (!task.hasTests) {
    guardrails.push('add characterization tests before changes');
  }

  if (task.blastRadius === 'system') {
    ruleOutDelegate = true;
    reasons.push('a system-wide blast radius needs small reviewable diffs');
    guardrails.push('small reviewable diffs');
  } else if (task.blastRadius === 'module') {
    guardrails.push('review the diff module by module, not only the end result');
  }

  const readyToDelegate =
    !ruleOutDelegate &&
    (task.kind === 'boilerplate' || task.kind === 'migration' || task.kind === 'refactor') &&
    task.hasTests &&
    task.specClarity === 'clear' &&
    task.sensitivity === 'low';

  let mode: Mode;
  if (forceManual) {
    mode = 'manual';
  } else if (readyToDelegate) {
    mode = 'delegate';
    reasons.push(`${task.kind} with tests and a clear spec is safe to delegate`);
    guardrails.push('run typecheck and tests in the loop');
  } else {
    mode = 'pair';
  }

  const reason = reasons.length > 0 ? reasons.join('; ') : 'no strong signal either way, default to pairing';

  return { mode, guardrails, reason };
}

export type Diff = {
  filesChanged: number;
  addedDeps: string[];
  testsModified: boolean;
  testsAdded: boolean;
  touchesAuthOrPayments: boolean;
};

export function reviewChecklist(diff: Diff): string[] {
  const items: string[] = [];

  if (diff.touchesAuthOrPayments) {
    items.push('get a second reviewer for auth or payments code');
  }

  if (diff.filesChanged > 15) {
    items.push('ask for a split');
  }

  for (const dep of diff.addedDeps) {
    items.push(`audit new dependency "${dep}" (lesson 68)`);
  }

  if (diff.testsModified && !diff.testsAdded) {
    items.push('verify tests were not weakened to pass');
  }

  items.push('read the diff line by line before approving');

  return items;
}

const sampleTasks: Task[] = [
  { kind: 'boilerplate', hasTests: true, specClarity: 'clear', blastRadius: 'file', sensitivity: 'low' },
  { kind: 'security', hasTests: true, specClarity: 'clear', blastRadius: 'module', sensitivity: 'high' },
  { kind: 'feature', hasTests: false, specClarity: 'vague', blastRadius: 'system', sensitivity: 'low' },
];

const sampleDiff: Diff = {
  filesChanged: 22,
  addedDeps: ['left-pad'],
  testsModified: true,
  testsAdded: false,
  touchesAuthOrPayments: true,
};

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>Triage</h3>
      <ul>
        {sampleTasks.map((t, i) => {
          const result = triageTask(t);
          return (
            <li key={i}>
              {t.kind}: {result.mode} — {result.guardrails.join(', ')} ({result.reason})
            </li>
          );
        })}
      </ul>
      <h3>Review checklist</h3>
      <ol>
        {reviewChecklist(sampleDiff).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
