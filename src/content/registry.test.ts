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
    // Planned lessons without a module are shown as locked; lessons 102-115 (go, postgres,
    // graphql, interview) are currently planned but unauthored, so this set is non-empty
    // (see the next test), and the view must tolerate it either way.
    for (const l of all) expect(curriculum.some((p) => p.id === l.planned.id)).toBe(true);
  });

  it('every track lists its planned lessons in curriculum order, and unauthored ones have no module', () => {
    const view = getCurriculumView();
    for (const { track, lessons } of view) {
      const plannedIds = curriculum.filter((p) => p.track === track.id).map((p) => p.id);
      expect(lessons.map((l) => l.planned.id), track.id).toEqual(plannedIds);
      for (const l of lessons) {
        if (l.lesson) expect(l.lesson.id).toBe(l.planned.id);
        else expect(getLesson(l.planned.id)).toBeUndefined();
      }
    }
    // Content lands over time; whatever is unauthored right now must be exactly the set the
    // dashboard shows as "coming soon", so the view never invents or hides a lesson.
    const unauthored = curriculum.filter((p) => getLesson(p.id) === undefined).map((p) => p.id);
    const locked = view.flatMap((v) => v.lessons).filter((l) => l.lesson === undefined).map((l) => l.planned.id);
    expect(locked).toEqual(unauthored);
  });

  it('every step id inside a lesson is unique', () => {
    for (const lesson of getLessons()) {
      const ids = lesson.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
