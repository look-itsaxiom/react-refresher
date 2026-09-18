import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

declare global {
  interface Window {
    __chartLoads?: number;
  }
}

export const checks: Check[] = [
  {
    name: 'the Chart module does not evaluate until its tab is actually shown',
    run: async ({ render, Component, expect }) => {
      window.__chartLoads = 0;
      render(<Component />);
      expect(window.__chartLoads, 'Chart.tsx ran before the Chart tab was ever activated').to.equal(0);
    },
  },
  {
    name: 'activating the Chart tab loads the chunk once and renders its content',
    run: async ({ render, screen, user, act, Component, expect }) => {
      window.__chartLoads = 0;
      render(<Component />);
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Chart' }));
      });
      await waitFor(() => screen.getByText('Revenue'));
      expect(window.__chartLoads, 'expected the Chart module to have evaluated exactly once').to.equal(1);
    },
  },
  {
    name: 'hovering the Chart tab preloads the chunk before the tab is clicked',
    run: async ({ render, screen, user, Component, expect }) => {
      window.__chartLoads = 0;
      render(<Component />);
      await user.hover(screen.getByRole('button', { name: 'Chart' }));
      await waitFor(() => expect(window.__chartLoads).to.equal(1));
      expect(
        screen.queryByText('Revenue'),
        'hovering should only warm the chunk, not switch the visible tab',
      ).to.equal(null);
    },
  },
];
