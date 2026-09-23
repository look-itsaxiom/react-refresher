import { describe, it, expect } from 'vitest';
import { getPath, getPathView, paths, pathStopFor } from './paths';
import { curriculum } from './curriculum';

describe('paths', () => {
  it('every stop references a planned lesson exactly once', () => {
    const planned = new Set(curriculum.map((p) => p.id));
    for (const path of paths) {
      const ids = path.stops.map((s) => s.lessonId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(planned.has(id), `${path.id}: unknown lesson ${id}`).toBe(true);
    }
  });

  it('getPathView resolves authored and unauthored stops in order', () => {
    const view = getPathView('integrate-fullstack');
    expect(view.path.id).toBe('integrate-fullstack');
    expect(view.stops.length).toBe(getPath('integrate-fullstack')!.stops.length);
    const first = view.stops[0]!;
    expect(first.planned.id).toBe(first.stop.lessonId);
    for (const s of view.stops) expect(s.lesson === undefined || s.lesson.id === s.stop.lessonId, s.stop.lessonId).toBe(true); // authored stops resolve to their own lesson; unauthored ones stay undefined
    expect(view.stops.some((s) => s.lesson !== undefined)).toBe(true);
  });

  it('pathStopFor finds the stop note for a lesson on a path', () => {
    expect(pathStopFor('75-graphql-fundamentals')?.path.id).toBe('integrate-fullstack');
    expect(pathStopFor('01-rendering-and-state')).toBeUndefined();
  });
});
