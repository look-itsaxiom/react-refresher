import { describe, it, expect } from 'vitest';
import { getLessons, getLesson, stepKey, findExercise, getCurriculumView } from './registry';
import { curriculum, tracks } from './curriculum';

describe('content registry', () => {
  it('discovers lessons and each has a matching curriculum entry', () => {
    const lessons = getLessons();
    for (const lesson of lessons) {
      const planned = curriculum.find((p) => p.id === lesson.id);
      expect(planned, `lesson ${lesson.id} missing from curriculum.ts`).toBeDefined();
      expect(planned?.track).toBe(lesson.track);
    }
  });

  it('orders lessons by curriculum order, not folder order', () => {
    const ids = getLessons().map((l) => l.id);
    const order = curriculum.map((p) => p.id);
    const sorted = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    expect(ids).toEqual(sorted);
  });

  it('builds stable step keys and finds exercises by key', () => {
    expect(stepKey('a', 'b')).toBe('a/b');
    for (const lesson of getLessons()) {
      for (const step of lesson.steps) {
        if (step.kind !== 'exercise') continue;
        const found = findExercise(stepKey(lesson.id, step.id));
        expect(found?.step).toBe(step);
        expect(found?.lesson).toBe(lesson);
      }
    }
    expect(findExercise('nope/nope')).toBeUndefined();
    expect(getLesson('nope')).toBeUndefined();
  });

  it('curriculum view has every track, one entry per planned lesson, and only authored lessons are available', () => {
    const view = getCurriculumView();
    expect(view.map((v) => v.track.id)).toEqual(tracks.map((t) => t.id));
    const all = view.flatMap((v) => v.lessons);
    expect(all.length).toBe(curriculum.length);
    const available = all.filter((l) => l.lesson !== undefined);
    expect(available.length).toBe(getLessons().length);
    // Planned lessons without a module are shown as locked; since the curriculum is now fully
    // authored this set is empty, but the view must still tolerate it for future additions.
    for (const l of all) expect(curriculum.some((p) => p.id === l.planned.id)).toBe(true);
  });

  it('every step id inside a lesson is unique', () => {
    for (const lesson of getLessons()) {
      const ids = lesson.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
