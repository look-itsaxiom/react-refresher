import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { progressStore } from '../progress/useProgress';
import { emptyProgress } from '../progress/types';
import { initialSandboxState, type SandboxState } from '../exercise/sandbox-reducer';

vi.mock('../components/Markdown', () => ({ Markdown: ({ source }: { source: string }) => <div>{source}</div> }));
vi.mock('../exercise/CodeEditor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea aria-label="editor" value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const sandbox = {
  state: { ...initialSandboxState, ready: true } as SandboxState,
  iframeRef: { current: null },
  runPreview: vi.fn(),
  runChecks: vi.fn(),
  clearLogs: vi.fn(),
};
vi.mock('../exercise/useSandbox', () => ({ useSandbox: () => sandbox }));

import { ExerciseStep } from './ExerciseStep';

const step: ExerciseStepData = {
  kind: 'exercise', id: 'ex', title: 'Ex', prompt: 'Do the thing',
  files: { 'App.tsx': 'starter code', 'util.ts': 'export const x = 1;' },
  solution: { 'App.tsx': 'solution code', 'util.ts': 'export const x = 1;' },
  hints: ['first hint', 'second hint'],
  checks: [{ name: 'c1', run: () => {} }, { name: 'c2', run: () => {} }],
};

beforeEach(() => {
  progressStore.replace(emptyProgress());
  sandbox.state = { ...initialSandboxState, ready: true };
  vi.clearAllMocks();
});

describe('ExerciseStep', () => {
  it('shows starter code, saves edits to progress, and runs checks', async () => {
    const user = userEvent.setup();
    render(<ExerciseStep step={step} lessonId="l" />);
    const editor = screen.getByLabelText('editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('starter code');
    await user.clear(editor);
    await user.type(editor, 'edited');
    expect(progressStore.getSnapshot().code['l/ex']?.['App.tsx']).toBe('edited');
    await user.click(screen.getByRole('button', { name: /run checks/i }));
    expect(sandbox.runChecks).toHaveBeenCalledWith(expect.objectContaining({ 'App.tsx': 'edited' }), 'App.tsx', 'l/ex');
  });

  it('restores saved code over the starter', () => {
    progressStore.saveCode('l/ex', { 'App.tsx': 'saved!', 'util.ts': 'export const x = 1;' });
    render(<ExerciseStep step={step} lessonId="l" />);
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toBe('saved!');
  });

  it('switches files with tabs and resets to starter', async () => {
    const user = userEvent.setup();
    progressStore.saveCode('l/ex', { 'App.tsx': 'changed', 'util.ts': 'changed too' });
    render(<ExerciseStep step={step} lessonId="l" />);
    await user.click(screen.getByRole('tab', { name: 'util.ts' }));
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toBe('changed too');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toBe('export const x = 1;');
    expect(progressStore.getSnapshot().code['l/ex']).toBeUndefined();
  });

  it('reveals hints progressively and shows the solution read-only on request', async () => {
    const user = userEvent.setup();
    render(<ExerciseStep step={step} lessonId="l" />);
    expect(screen.queryByText('first hint')).toBeNull();
    await user.click(screen.getByRole('button', { name: /show a hint/i }));
    expect(screen.getByText('first hint')).toBeTruthy();
    expect(screen.queryByText('second hint')).toBeNull();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /show solution/i }));
    expect(screen.getByText('solution code')).toBeTruthy();
  });

  it('marks the step complete when all checks pass', () => {
    sandbox.state = { ...initialSandboxState, ready: true, phase: 'ok', results: [{ name: 'c1', status: 'pass', durationMs: 1 }], allPassed: true };
    render(<ExerciseStep step={step} lessonId="l" />);
    expect(progressStore.getSnapshot().steps['l/ex']).toBeDefined();
    expect(screen.getByText(/all checks passed/i)).toBeTruthy();
  });
});
