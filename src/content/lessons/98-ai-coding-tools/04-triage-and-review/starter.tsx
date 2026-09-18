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
  // TODO: implement the rules from prompt.md.
  return { mode: 'manual', guardrails: [], reason: 'not implemented' };
}

export type Diff = {
  filesChanged: number;
  addedDeps: string[];
  testsModified: boolean;
  testsAdded: boolean;
  touchesAuthOrPayments: boolean;
};

export function reviewChecklist(diff: Diff): string[] {
  // TODO: implement the ordered checklist from prompt.md.
  return [];
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
