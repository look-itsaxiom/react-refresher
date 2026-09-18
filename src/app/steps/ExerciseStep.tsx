import { useEffect, useState } from 'react';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { stepKey } from '../../content/registry';
import { PREVIEW_PATH } from '../../sandbox/protocol';
import { progressStore, useProgress } from '../progress/useProgress';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';
import { CodeEditor } from '../exercise/CodeEditor';
import { useSandbox } from '../exercise/useSandbox';
import { ChecksPanel } from '../exercise/ChecksPanel';
import { ConsolePanel } from '../exercise/ConsolePanel';
import { HintsPanel } from '../exercise/HintsPanel';

const PREVIEW_DEBOUNCE_MS = 400;

export function ExerciseStep({ step, lessonId }: { step: ExerciseStepData; lessonId: string }) {
  const key = stepKey(lessonId, step.id);
  const entry = step.entry ?? 'App.tsx';
  const progress = useProgress();
  const files = progress.code[key] ?? step.files;
  const done = progress.steps[key] !== undefined;
  const fileNames = Object.keys(step.files);
  const [activeFile, setActiveFile] = useState(entry in step.files ? entry : fileNames[0] ?? entry);
  const [showSolution, setShowSolution] = useState(false);
  const { state, iframeRef, runPreview, runChecks, clearLogs } = useSandbox();

  // Live preview: debounce after edits; also run once when the iframe becomes ready.
  useEffect(() => {
    if (!state.ready) return;
    const t = setTimeout(() => runPreview(files, entry, key), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [files, entry, key, state.ready, runPreview]);

  // Completion is derived from the sandbox result.
  useEffect(() => {
    if (state.allPassed && state.results) progressStore.completeStep(key);
  }, [state.allPassed, state.results, key]);

  function handleChange(next: string) {
    progressStore.saveCode(key, { ...files, [activeFile]: next });
  }

  function handleRunChecks() {
    runChecks(files, entry, key);
  }

  function handleReset() {
    if (!window.confirm('Reset this exercise to the starter code? Your edits will be lost.')) return;
    progressStore.clearCode(key);
    setShowSolution(false);
  }

  function handleShowSolution() {
    if (showSolution) { setShowSolution(false); return; }
    if (!window.confirm('Show the solution? Try the hints first if you have not.')) return;
    setShowSolution(true);
  }

  const editorValue = (showSolution ? step.solution : files)[activeFile] ?? '';

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,1fr)_minmax(0,1.6fr)_minmax(280px,1fr)]">
      {/* Prompt + hints */}
      <aside className="min-h-0 overflow-y-auto border-r border-border p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{step.title}</h2>
          {done && <span className="shrink-0 text-xs text-success">✓ Complete</span>}
        </div>
        <Markdown source={step.prompt} className="mt-3" />
        <HintsPanel hints={step.hints} />
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" variant="ghost" onClick={handleReset}>Reset to starter</Button>
          <Button size="sm" variant={showSolution ? 'primary' : 'ghost'} onClick={handleShowSolution}>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </Button>
        </div>
      </aside>

      {/* Editor */}
      <section className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 pr-2">
          <div role="tablist" className="flex">
            {fileNames.map((name) => (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={name === activeFile}
                onClick={() => setActiveFile(name)}
                className={`px-3 py-1.5 text-xs font-mono border-r border-border ${name === activeFile ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'}`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {showSolution && <span className="text-xs text-warning">Viewing solution (read-only)</span>}
            <Button size="sm" onClick={handleRunChecks} disabled={!state.ready || state.phase === 'checking'}>
              {state.phase === 'checking' ? 'Running…' : 'Run checks'}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor key={`${activeFile}:${showSolution}`} value={editorValue} onChange={showSolution ? undefined : handleChange} onRun={handleRunChecks} readOnly={showSolution} />
        </div>
      </section>

      {/* Preview + results + console */}
      <section className="grid min-h-0 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
        <div className="min-h-0 border-b border-border">
          <iframe
            ref={iframeRef}
            src={PREVIEW_PATH}
            title="Preview"
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full bg-[#111318]"
          />
        </div>
        <div className="min-h-0 overflow-y-auto border-b border-border">
          <ChecksPanel state={state} total={step.checks.length} />
        </div>
        <div className="min-h-0">
          <ConsolePanel logs={state.logs} onClear={clearLogs} />
        </div>
      </section>
    </div>
  );
}
