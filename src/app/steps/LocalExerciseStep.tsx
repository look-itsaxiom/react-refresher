import { useState } from 'react';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { stepKey } from '../../content/registry';
import { progressStore, useProgress } from '../progress/useProgress';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';
import { HintsPanel } from '../exercise/HintsPanel';
import { CodeEditor } from '../exercise/CodeEditor';
import { allExpectedPassed, runLocalCheck, type LocalCheckResponse } from '../exercise/local-check-client';

type Props = {
  step: ExerciseStepData;
  lessonId: string;
  runner?: (dir: string) => Promise<LocalCheckResponse>;
  onComplete?: (key: string) => void;
};

const errorText: Record<NonNullable<LocalCheckResponse['error']>, string> = {
  'go-not-found': 'The dev server could not find `go` on your PATH. Install Go from https://go.dev/dl/ (1.22 or newer), restart the dev server, and try again.',
  'no-dev-server': 'No dev server is running (static build). Run the command below in your terminal, then mark the step complete.',
  timeout: 'go test ran for more than 60 seconds and was stopped. Look for an infinite loop or a blocked goroutine.',
  'not-found': 'The exercise folder is missing. Check that the repository is up to date.',
  'bad-request': 'The dev server rejected the request.',
  forbidden: 'The dev server rejected the request origin.',
  'spawn-failed': 'The dev server could not start go test. See the raw output.',
};

export function LocalExerciseStep({ step, lessonId, runner = runLocalCheck, onComplete = (key) => progressStore.completeStep(key) }: Props) {
  const key = stepKey(lessonId, step.id);
  const progress = useProgress();
  const done = progress.steps[key] !== undefined;
  const local = step.local;
  const fileNames = Object.keys(step.files);
  const [activeFile, setActiveFile] = useState(fileNames[0] ?? '');
  const [showSolution, setShowSolution] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LocalCheckResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  if (!local) return <p className="p-5 text-danger">This exercise is marked runtime: local but has no `local` config.</p>;
  const folder = `exercises-local/${local.dir}`;

  async function run() {
    setRunning(true);
    try {
      const r = await runner(local!.dir);
      setResult(r);
      if (allExpectedPassed(r, local!.expectedTests)) onComplete(key);
    } finally {
      setRunning(false);
    }
  }

  const source = showSolution ? step.solution : step.files;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,1fr)_minmax(0,1.6fr)_minmax(280px,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-border p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{step.title}</h2>
          {done && <span className="shrink-0 text-xs text-success">✓ Complete</span>}
        </div>
        <Markdown source={step.prompt} className="mt-3" />
        <div className="mt-4 rounded border border-border bg-surface-2 p-3 text-sm">
          <p className="text-ink-muted">Runs on your machine:</p>
          <p className="mt-1 font-mono text-xs break-all">{folder}</p>
          <p className="mt-1 font-mono text-xs">{local.command}</p>
        </div>
        <HintsPanel hints={step.hints} />
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" variant={showSolution ? 'primary' : 'ghost'} onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 pr-2">
          <div role="tablist" className="flex">
            {fileNames.map((name) => (
              <button key={name} role="tab" type="button" aria-selected={name === activeFile} onClick={() => setActiveFile(name)}
                className={`px-3 py-1.5 text-xs font-mono border-r border-border ${name === activeFile ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'}`}>
                {name}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink-muted">Read-only copy. Edit the files in {folder}.</span>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor key={`${activeFile}:${showSolution}`} value={source[activeFile] ?? ''} readOnly />
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void run()} disabled={running}>{running ? 'Running…' : 'Run go test'}</Button>
          {result && <span className="text-xs text-ink-muted">{result.durationMs} ms</span>}
        </div>
        {result?.error && (
          <div className="rounded border border-warning/40 bg-warning/10 p-3 text-sm">
            <Markdown source={errorText[result.error]} />
            {result.error === 'no-dev-server' && !done && (
              <Button size="sm" className="mt-2" onClick={() => onComplete(key)}>Mark complete</Button>
            )}
          </div>
        )}
        {result && result.tests.length > 0 && (
          <ul className="space-y-1">
            {result.tests.map((t) => (
              <li key={t.name} className="rounded border border-border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{t.name}</span>
                  <span className={t.status === 'pass' ? 'text-success' : t.status === 'fail' ? 'text-danger' : 'text-ink-muted'}>{t.status}</span>
                </div>
                {t.status === 'fail' && t.output && <pre className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">{t.output}</pre>}
              </li>
            ))}
          </ul>
        )}
        {result && (
          <button type="button" className="text-xs text-ink-muted underline" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? 'Hide raw output' : 'Show raw output'}
          </button>
        )}
        {showRaw && result && <pre className="whitespace-pre-wrap text-xs">{result.raw}</pre>}
      </section>
    </div>
  );
}
