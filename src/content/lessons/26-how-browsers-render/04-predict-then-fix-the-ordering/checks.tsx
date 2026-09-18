import type { Check } from '../../../types';

type Step = { kind: 'sync' | 'microtask' | 'task' | 'raf'; label: string };

export const checks: Check[] = [
  {
    name: 'runOrdered resolves in real execution order: sync, then microtask, then task, then raf',
    run: async ({ mod, expect }) => {
      const runOrdered = mod.runOrdered as (steps: Step[]) => Promise<string[]>;
      const result = await runOrdered([
        { kind: 'raf', label: 'raf' },
        { kind: 'task', label: 'task' },
        { kind: 'sync', label: 'sync' },
        { kind: 'microtask', label: 'microtask' },
      ]);
      expect(result).to.deep.equal(['sync', 'microtask', 'task', 'raf']);
    },
  },
  {
    name: 'multiple steps of the same kind keep their relative call order',
    run: async ({ mod, expect }) => {
      const runOrdered = mod.runOrdered as (steps: Step[]) => Promise<string[]>;
      const result = await runOrdered([
        { kind: 'task', label: 'T1' },
        { kind: 'sync', label: 'S1' },
        { kind: 'microtask', label: 'M1' },
        { kind: 'sync', label: 'S2' },
        { kind: 'microtask', label: 'M2' },
        { kind: 'task', label: 'T2' },
      ]);
      expect(result).to.deep.equal(['S1', 'S2', 'M1', 'M2', 'T1', 'T2']);
    },
  },
  {
    name: 'yieldToMain really yields: a racing setTimeout counter keeps advancing throughout a long task',
    run: async ({ mod, expect }) => {
      const runLongTask = mod.runLongTask as (
        chunks: number,
        msPerChunk: number,
        onYield?: () => void,
      ) => Promise<void>;
      let racer = 0;
      let stop = false;
      const tick = () => {
        if (stop) return;
        racer++;
        setTimeout(tick, 0);
      };
      tick();
      let yields = 0;
      await runLongTask(6, 4, () => {
        yields++;
      });
      stop = true;
      expect(yields).to.equal(6);
      // A stub that never truly yields (resolves as a microtask, or immediately) lets the
      // whole long task run before the racer's task-queued counter gets a single turn.
      expect(racer).to.be.at.least(4);
    },
  },
  {
    name: 'clicking "Run ordering demo" shows the resolved order in the DOM',
    run: async ({ render, screen, user, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      await user.click(screen.getByRole('button', { name: 'Run ordering demo' }));
      const el = await screen.findByTestId('order');
      expect(el.textContent).to.equal('sync, microtask, task, raf');
    },
  },
];
