import { describe, it, expect } from 'vitest';
import { lessonStatus, lessonCompletion, overallCompletion, firstIncompleteStepIndex, pathCompletion } from './dashboard-status';
import { getPathView } from '../content/paths';
import { emptyProgress } from './progress/types';
import type { Lesson } from '../content/types';

const lesson: Lesson = {
  id: 'l1', title: 'L1', track: 'refresher', summary: '',
  steps: [
    { kind: 'concept', id: 'a', title: 'A', markdown: '' },
    { kind: 'quiz', id: 'b', title: 'B', questions: [] },
    { kind: 'concept', id: 'c', title: 'C', markdown: '' },
  ],
};

const done = (...keys: string[]) => ({
  ...emptyProgress(),
  steps: Object.fromEntries(keys.map((k) => [k, { completedAt: 'x' }])),
});

describe('dashboard status', () => {
  it('is available with nothing done, in-progress with some, done with all', () => {
    expect(lessonStatus(lesson, emptyProgress())).toBe('available');
    expect(lessonStatus(lesson, done('l1/a'))).toBe('in-progress');
    expect(lessonStatus(lesson, done('l1/a', 'l1/b', 'l1/c'))).toBe('done');
  });

  it('ignores steps from other lessons', () => {
    expect(lessonStatus(lesson, done('l2/a'))).toBe('available');
  });

  it('counts completion and overall percent', () => {
    expect(lessonCompletion(lesson, done('l1/a'))).toEqual({ done: 1, total: 3 });
    expect(overallCompletion([lesson, { ...lesson, id: 'l2' }], done('l1/a', 'l1/b', 'l1/c'))).toEqual({ done: 3, total: 6, percent: 50 });
    expect(overallCompletion([], emptyProgress()).percent).toBe(0);
  });

  it('finds the first incomplete step, or 0 when all done', () => {
    expect(firstIncompleteStepIndex(lesson, done('l1/a'))).toBe(1);
    expect(firstIncompleteStepIndex(lesson, done('l1/a', 'l1/b', 'l1/c'))).toBe(0);
  });
});

describe('pathCompletion', () => {
  it('counts only authored stops and finds the first incomplete one', () => {
    const view = getPathView('integrate-fullstack');
    const empty = pathCompletion(view, emptyProgress());
    expect(empty.done).toBe(0);
    expect(empty.total).toBeGreaterThan(0);
    expect(empty.authoredStops).toBeLessThan(view.stops.length);
    expect(empty.nextLessonId).toBe(view.stops.find((s) => s.lesson)!.planned.id);
  });
});
