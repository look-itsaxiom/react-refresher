import type { Check } from '../../../types';

type Boundary = { id: string; ready: boolean; priority: number };
type QueuedEvent = { boundaryId: string; type: string };
type Mod = {
  planHydration: (boundaries: Boundary[], interactions: string[]) => string[];
  replayEvents: (order: string[], queuedEvents: QueuedEvent[]) => QueuedEvent[];
};

const boundaries: Boundary[] = [
  { id: 'header', ready: true, priority: 2 },
  { id: 'comments', ready: true, priority: 5 },
  { id: 'sidebar', ready: false, priority: 1 },
  { id: 'footer', ready: true, priority: 1 },
];

export const checks: Check[] = [
  {
    name: 'ready boundaries with no interaction hydrate in ascending priority order, and not-ready boundaries are excluded',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planHydration } = mod as unknown as Mod;
      const order = planHydration(boundaries, []);
      expect(order).to.deep.equal(['footer', 'header', 'comments']);
    },
  },
  {
    name: 'a boundary the user interacted with jumps to the front, ahead of priority, but only if it is ready',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planHydration } = mod as unknown as Mod;
      // "comments" (priority 5, last by priority) was clicked, so it jumps
      // the queue. "sidebar" was also clicked but isn't ready, so it can't
      // jump the queue and stays excluded.
      const order = planHydration(boundaries, ['sidebar', 'comments']);
      expect(order).to.deep.equal(['comments', 'footer', 'header']);
    },
  },
  {
    name: 'repeated interactions with the same boundary do not duplicate it or move it twice',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planHydration } = mod as unknown as Mod;
      const order = planHydration(boundaries, ['comments', 'header', 'comments']);
      expect(order).to.deep.equal(['comments', 'header', 'footer']);
    },
  },
  {
    name: 'replayEvents groups queued events by boundary in hydration order, keeping each boundary\'s own events in their original relative order',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { replayEvents } = mod as unknown as Mod;
      const order = ['comments', 'footer', 'header'];
      const queued: QueuedEvent[] = [
        { boundaryId: 'header', type: 'focus' },
        { boundaryId: 'comments', type: 'click' },
        { boundaryId: 'footer', type: 'click' },
        { boundaryId: 'comments', type: 'submit' },
        { boundaryId: 'header', type: 'input' },
      ];
      const replayed = replayEvents(order, queued);
      expect(replayed).to.deep.equal([
        { boundaryId: 'comments', type: 'click' },
        { boundaryId: 'comments', type: 'submit' },
        { boundaryId: 'footer', type: 'click' },
        { boundaryId: 'header', type: 'focus' },
        { boundaryId: 'header', type: 'input' },
      ]);
    },
  },
  {
    name: 'replayEvents drops events for a boundary that is not in the hydration order',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { replayEvents } = mod as unknown as Mod;
      const order = ['footer'];
      const queued: QueuedEvent[] = [
        { boundaryId: 'sidebar', type: 'click' },
        { boundaryId: 'footer', type: 'click' },
      ];
      const replayed = replayEvents(order, queued);
      expect(replayed).to.deep.equal([{ boundaryId: 'footer', type: 'click' }]);
    },
  },
];
