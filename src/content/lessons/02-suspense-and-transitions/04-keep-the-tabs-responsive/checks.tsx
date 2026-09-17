import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders the Home tab initially',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.queryByText('Welcome home. Pick a tab.')).to.not.equal(null);
    },
  },
  {
    name: 'eventually shows the posts after clicking Posts',
    run: async ({ render, screen, user, server, act, Component }) => {
      server.setLatency(50);
      render(<Component />);
      // The click starts a transition that suspends; without wrapping it in `act`, React can
      // schedule the retry outside the act scope and the DOM never catches up in jsdom.
      await act(async () => {
        await user.click(screen.getByRole('tab', { name: 'Posts' }));
      });
      await screen.findByText('Why state is a snapshot', undefined, { timeout: 2000 });
    },
  },
  {
    name: 'keeps Home visible instead of the fallback while Posts loads (transition)',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(400);
      render(<Component />);
      await user.click(screen.getByRole('tab', { name: 'Posts' }));
      expect(screen.queryByText('Loading…'), 'fallback should not replace visible content').to.equal(null);
      expect(screen.queryByText('Welcome home. Pick a tab.'), 'Home content should remain').to.not.equal(null);
    },
  },
  {
    name: 'marks the nav as pending during the transition and clears it afterwards',
    run: async ({ render, screen, user, expect, server, act, Component }) => {
      server.setLatency(400);
      render(<Component />);
      const nav = screen.getByRole('navigation');
      expect(nav.getAttribute('data-pending')).to.equal('false');
      // Wrapped in `act` so React properly tracks the suspended retry; it still returns before
      // the 400ms latency elapses, so the pending state below is observed mid-flight.
      await act(async () => {
        await user.click(screen.getByRole('tab', { name: 'Posts' }));
      });
      expect(nav.getAttribute('data-pending'), 'while loading').to.equal('true');
      await screen.findByText('Why state is a snapshot', undefined, { timeout: 2000 });
      expect(nav.getAttribute('data-pending'), 'after loading').to.equal('false');
    },
  },
];
