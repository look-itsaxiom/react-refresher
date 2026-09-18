import type { ExerciseStep, Lesson, TrackView } from './types';
import { curriculum, tracks } from './curriculum';

const modules = import.meta.glob<{ default: Lesson }>('./lessons/*/lesson.ts', { eager: true });

const byId = new Map<string, Lesson>();
for (const mod of Object.values(modules)) byId.set(mod.default.id, mod.default);

const order = new Map(curriculum.map((p, i) => [p.id, i] as const));

export function getLessons(): Lesson[] {
  return [...byId.values()].sort(
    (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function getLesson(id: string): Lesson | undefined {
  return byId.get(id);
}

export function stepKey(lessonId: string, stepId: string): string {
  return `${lessonId}/${stepId}`;
}

export function findExercise(key: string): { lesson: Lesson; step: ExerciseStep } | undefined {
  const slash = key.indexOf('/');
  if (slash === -1) return undefined;
  const lesson = byId.get(key.slice(0, slash));
  const step = lesson?.steps.find((s) => s.id === key.slice(slash + 1));
  if (!lesson || !step || step.kind !== 'exercise') return undefined;
  return { lesson, step };
}

export function getCurriculumView(): TrackView[] {
  return tracks.map((track) => ({
    track,
    lessons: curriculum
      .filter((p) => p.track === track.id)
      .map((planned) => ({ planned, lesson: byId.get(planned.id) })),
  }));
}
