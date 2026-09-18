// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getLessons } from '../registry';
import type { ExerciseStep } from '../types';

const goAvailable = spawnSync('go', ['version'], { encoding: 'utf8', windowsHide: true }).status === 0;
const root = resolve(import.meta.dirname, '../../..');

const locals = getLessons().flatMap((lesson) =>
  lesson.steps
    .filter((s): s is ExerciseStep => s.kind === 'exercise' && s.runtime === 'local')
    .map((step) => ({ lesson, step })),
);

function goTest(dir: string, tags?: string) {
  const args = ['test', '-count=1', ...(tags ? ['-tags', tags] : []), './...'];
  return spawnSync('go', args, { cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 120_000 });
}

describe('local (go) exercises', () => {
  it('smoke fixture: starter fails, solution passes', { timeout: 180_000 }, () => {
    if (!goAvailable) { console.warn('go not installed; skipping local exercise validation'); return; }
    const dir = resolve(root, 'exercises-local/_smoke');
    expect(goTest(dir).status).not.toBe(0);
    expect(goTest(dir, 'solution').status).toBe(0);
  });

  for (const { lesson, step } of locals) {
    describe(`${lesson.id}/${step.id}`, () => {
      it('declares a folder that exists with a go.mod and expected tests', () => {
        expect(step.local, 'runtime local requires step.local').toBeDefined();
        const dir = resolve(root, 'exercises-local', step.local!.dir);
        expect(existsSync(resolve(dir, 'go.mod')), `${dir}/go.mod missing`).toBe(true);
        expect(step.local!.expectedTests.length).toBeGreaterThan(0);
        expect(step.hints.length).toBeGreaterThan(0);
        expect(step.checks).toEqual([]);
      });

      it('starter fails and solution passes under go test (and vets clean)', { timeout: 300_000 }, () => {
        if (!goAvailable) { console.warn('go not installed; skipping'); return; }
        const dir = resolve(root, 'exercises-local', step.local!.dir);
        const starter = goTest(dir);
        expect(starter.status, 'starter should fail at least one test').not.toBe(0);
        const solution = goTest(dir, 'solution');
        expect(solution.status, `solution failed:\n${solution.stdout}\n${solution.stderr}`).toBe(0);
        const vet = spawnSync('go', ['vet', '-tags', 'solution', './...'], { cwd: dir, encoding: 'utf8', windowsHide: true });
        expect(vet.status, `go vet failed:\n${vet.stderr}`).toBe(0);
      });
    });
  }
});
