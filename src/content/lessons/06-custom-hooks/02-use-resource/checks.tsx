import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows a loading state for both resources immediately',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByText(/loading user/i)).to.exist;
      expect(screen.getByText(/loading posts/i)).to.exist;
    },
  },
  {
    name: 'shows the fetched user and posts once loading finishes',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).to.equal('Ada Lovelace');
      });
      await waitFor(() => {
        const titles = screen.getAllByRole('listitem').map((li) => li.textContent);
        expect(titles).to.include('Why state is a snapshot');
      });
    },
  },
  {
    name: 'shows an error message instead of hanging when the server fails',
    run: async (ctx) => {
      ctx.server.failNext('Server unavailable');
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      await waitFor(
        () => {
          const alerts = screen.getAllByRole('alert').map((el) => el.textContent);
          expect(alerts.some((text) => text?.includes('Server unavailable'))).to.equal(true);
        },
        { timeout: 2000 },
      );
    },
  },
];
