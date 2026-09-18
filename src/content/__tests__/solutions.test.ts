import { describe, it, expect } from 'vitest';
import { getLessons } from '../registry';
import { runChecks } from '../../sandbox/runner';
import { baseRegistry } from '../../sandbox/registry';
import type { ExerciseStep, Lesson } from '../types';

const exercises: Array<{ lesson: Lesson; step: ExerciseStep }> = getLessons().flatMap((lesson) =>
  lesson.steps.filter((s): s is ExerciseStep => s.kind === 'exercise').map((step) => ({ lesson, step })),
);

describe('every exercise', () => {
  it('exists (at least one lesson with an exercise is registered)', () => {
    expect(exercises.length).toBeGreaterThan(0);
  });

  for (const { lesson, step } of exercises) {
    describe(`${lesson.id}/${step.id}`, () => {
      it('solution passes every check', async () => {
        const out = await runChecks({ files: step.solution, entry: step.entry, checks: step.checks, registry: baseRegistry });
        if (out.kind === 'compile-error') throw new Error(out.error.message);
        const failed = out.results.filter((r) => r.status === 'fail');
        expect(failed, failed.map((f) => `${f.name}: ${f.error}`).join('\n')).toEqual([]);
      });

      it('starter fails at least one check (exercise is not trivially complete)', async () => {
        const out = await runChecks({ files: step.files, entry: step.entry, checks: step.checks, registry: baseRegistry });
        if (out.kind === 'compile-error') return; // a non-compiling starter is a valid "fix the code" exercise
        expect(out.allPassed).toBe(false);
      });

      it('starter and solution have the same file names, and hints/prompt are non-empty', () => {
        expect(Object.keys(step.files).sort()).toEqual(Object.keys(step.solution).sort());
        expect(step.prompt.trim().length).toBeGreaterThan(0);
        expect(step.checks.length).toBeGreaterThan(0);
        expect(step.hints.length).toBeGreaterThan(0);
      });
    });
  }
});
