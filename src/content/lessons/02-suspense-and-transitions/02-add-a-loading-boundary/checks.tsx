import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows "Loading profile…" while the user is loading',
    // Take `ctx` whole: destructuring `Component` in the parameter list would evaluate the module
    // (and create `userPromise`) before `setLatency` runs.
    run: async (ctx) => {
      ctx.server.setLatency(300);
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.queryByText('Loading profile…'), 'fallback text').to.not.equal(null);
    },
  },
  {
    name: 'keeps the Profile heading visible during loading',
    run: async (ctx) => {
      ctx.server.setLatency(300);
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.queryByRole('heading', { level: 1, name: 'Profile' })).to.not.equal(null);
    },
  },
  {
    name: 'renders the user once loaded and removes the fallback',
    run: async (ctx) => {
      ctx.server.setLatency(50);
      const { render, screen, expect, Component } = ctx;
      // The initial render suspends; wrapping it in `act` lets React properly track the retry
      // once the promise resolves, so `findByText` below actually observes the update in jsdom.
      await ctx.act(async () => {
        render(<Component />);
      });
      await screen.findByText('Ada Lovelace', undefined, { timeout: 2000 });
      expect(screen.queryByText('Loading profile…')).to.equal(null);
    },
  },
];
