import type { Lesson } from '../content/types';
import { stepKey } from '../content/registry';
import type { Progress } from './progress/types';

export type LessonStatus = 'done' | 'in-progress' | 'available';

export function lessonCompletion(lesson: Lesson, progress: Progress): { done: number; total: number } {
  const done = lesson.steps.filter((s) => progress.steps[stepKey(lesson.id, s.id)] !== undefined).length;
  return { done, total: lesson.steps.length };
}

export function lessonStatus(lesson: Lesson, progress: Progress): LessonStatus {
  const { done, total } = lessonCompletion(lesson, progress);
  if (total > 0 && done === total) return 'done';
  if (done > 0) return 'in-progress';
  return 'available';
}

export function overallCompletion(lessons: Lesson[], progress: Progress): { done: number; total: number; percent: number } {
  let done = 0;
  let total = 0;
  for (const lesson of lessons) {
    const c = lessonCompletion(lesson, progress);
    done += c.done;
    total += c.total;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function firstIncompleteStepIndex(lesson: Lesson, progress: Progress): number {
  const i = lesson.steps.findIndex((s) => progress.steps[stepKey(lesson.id, s.id)] === undefined);
  return i === -1 ? 0 : i;
}
