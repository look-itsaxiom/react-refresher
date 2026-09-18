import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalExerciseStep } from './LocalExerciseStep';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { allExpectedPassed } from '../exercise/local-check-client';

const step: ExerciseStepData = {
  kind: 'exercise', id: 'add', title: 'Fix Add', prompt: 'Make the test pass.', hints: ['Use +'], checks: [],
  runtime: 'local',
  local: { dir: '_smoke', command: 'go test ./...', expectedTests: ['TestAdd'] },
  files: { 'smoke.go': 'package smoke\n\nfunc Add(a, b int) int { return a - b }\n' },
  solution: { 'smoke.go': 'package smoke\n\nfunc Add(a, b int) int { return a + b }\n' },
};

describe('LocalExerciseStep', () => {
  it('shows the folder, the command, and runs the check, rendering per-test results', async () => {
    const runner = vi.fn().mockResolvedValue({ ok: true, durationMs: 12, raw: '', tests: [{ name: 'TestAdd', status: 'pass', output: '' }] });
    const onComplete = vi.fn();
    render(<LocalExerciseStep step={step} lessonId="102" runner={runner} onComplete={onComplete} />);
    expect(screen.getByText(/exercises-local[\\/]_smoke/, { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('go test ./...')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /run go test/i }));
    expect(runner).toHaveBeenCalledWith('_smoke');
    const item = (await screen.findByText('TestAdd')).closest('li')!;
    expect(item).toBeTruthy();
    expect(within(item).getByText(/pass/i)).toBeTruthy();
    expect(onComplete).toHaveBeenCalledWith('102/add');
  });

  it('explains when go is missing and offers manual completion when there is no dev server', async () => {
    const runner = vi.fn().mockResolvedValue({ ok: false, durationMs: 0, raw: '', tests: [], error: 'go-not-found' });
    render(<LocalExerciseStep step={step} lessonId="102" runner={runner} onComplete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /run go test/i }));
    expect(await screen.findByText(/install go/i)).toBeTruthy();
    const noServer = vi.fn().mockResolvedValue({ ok: false, durationMs: 0, raw: '', tests: [], error: 'no-dev-server' });
    render(<LocalExerciseStep step={step} lessonId="102" runner={noServer} onComplete={() => {}} />);
    await userEvent.click(screen.getAllByRole('button', { name: /run go test/i })[1]!);
    expect(await screen.findByRole('button', { name: /mark complete/i })).toBeTruthy();
  });

  it('shows the spawn-failed explanation when the runner itself rejects', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('boom'));
    render(<LocalExerciseStep step={step} lessonId="102" runner={runner} onComplete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /run go test/i }));
    expect(await screen.findByText(/could not start go test/i)).toBeTruthy();
  });
});

describe('allExpectedPassed', () => {
  it('requires every expected test to pass', () => {
    const ok = { ok: true, durationMs: 0, raw: '', tests: [{ name: 'A', status: 'pass' as const, output: '' }] };
    expect(allExpectedPassed(ok, ['A'])).toBe(true);
    expect(allExpectedPassed(ok, ['A', 'B'])).toBe(false);
    expect(allExpectedPassed({ ...ok, ok: false }, ['A'])).toBe(false);
  });
});
