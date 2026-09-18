import type { Check } from '../../../types';

type FakeObserverModule = { FakeObserver: { activeCount: number } };

export const checks: Check[] = [
  {
    name: 'mounting the panel creates exactly one active observer',
    run: async ({ render, act, expect, mod, Component }) => {
      const { FakeObserver } = mod as unknown as FakeObserverModule;
      await act(async () => {
        render(<Component />);
      });
      expect(FakeObserver.activeCount).to.equal(1);
    },
  },
  {
    name: 'unmounting the panel disconnects the observer',
    run: async ({ render, screen, user, act, expect, mod, Component }) => {
      const { FakeObserver } = mod as unknown as FakeObserverModule;
      await act(async () => {
        render(<Component />);
      });
      await user.click(screen.getByRole('button', { name: 'Unmount panel' }));
      expect(FakeObserver.activeCount).to.equal(0);
    },
  },
  {
    name: 'remounting creates a fresh observer instead of stacking up leaked ones',
    run: async ({ render, screen, user, act, expect, mod, Component }) => {
      const { FakeObserver } = mod as unknown as FakeObserverModule;
      await act(async () => {
        render(<Component />);
      });
      await user.click(screen.getByRole('button', { name: 'Unmount panel' }));
      await user.click(screen.getByRole('button', { name: 'Mount panel' }));
      expect(FakeObserver.activeCount).to.equal(1);
    },
  },
];
