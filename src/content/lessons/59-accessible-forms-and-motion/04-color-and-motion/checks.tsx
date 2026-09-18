import type { Check } from '../../../types';
import type { ComponentType } from 'react';

type MatchMediaFn = (query: string) => MediaQueryList;

function createMatchMediaStub(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_event: string, cb: () => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_event: string, cb: () => void) => {
      listeners.delete(cb);
    },
  } as unknown as MediaQueryList;

  return {
    matchMedia: ((_query: string) => mql) as MatchMediaFn,
    set(value: boolean) {
      matches = value;
      listeners.forEach((cb) => cb());
    },
  };
}

export const checks: Check[] = [
  {
    name: 'each status renders a visible text label, not just a colored dot',
    run: ({ render, screen, expect, mod }) => {
      const { StatusList } = mod as { StatusList: ComponentType };
      render(<StatusList />);
      expect(screen.getByText(/queued/i)).to.exist;
      expect(screen.getByText(/running/i)).to.exist;
      expect(screen.getByText(/failed/i)).to.exist;
      expect(screen.getByText(/done/i)).to.exist;
    },
  },
  {
    name: 'each job\'s status word is paired with that specific item, not just present somewhere on the page',
    run: ({ render, screen, expect, mod }) => {
      const { StatusList } = mod as { StatusList: ComponentType };
      render(<StatusList />);
      const items = screen.getAllByRole('listitem');
      expect(items, 'expected one list item per job').to.have.length(4);

      const pairs: Array<[string, RegExp]> = [
        ['Build assets', /done/i],
        ['Run test suite', /failed/i],
        ['Deploy preview', /running/i],
        ['Publish report', /queued/i],
      ];
      for (const [jobName, statusPattern] of pairs) {
        const item = screen.getByText(jobName, { exact: false }).closest('li');
        expect(item, `expected a list item containing "${jobName}"`).to.exist;
        expect(item!.textContent, `expected ${jobName}'s item to include its status word as text, not just color`).to.match(
          statusPattern,
        );
      }
    },
  },
  {
    name: 'useReducedMotion returns false when no matchMedia function is reachable',
    run: ({ render, screen, expect, mod }) => {
      const { useReducedMotion } = mod as { useReducedMotion: (m?: MatchMediaFn) => boolean };
      function Probe() {
        const reduced = useReducedMotion(undefined);
        return <span>{reduced ? 'reduced' : 'full'}</span>;
      }
      render(<Probe />);
      expect(screen.getByText('full')).to.exist;
    },
  },
  {
    name: 'with a stub matcher returning matches: true, the announcement sets data-motion="reduced"',
    run: ({ render, screen, expect, mod }) => {
      const { Announcement } = mod as { Announcement: ComponentType<{ message: string; matchMedia?: MatchMediaFn }> };
      const stub = createMatchMediaStub(true);
      render(<Announcement message="Deploy preview is ready." matchMedia={stub.matchMedia} />);
      const status = screen.getByRole('status');
      expect(status.getAttribute('data-motion')).to.equal('reduced');
      expect(status.textContent).to.match(/deploy preview/i);
    },
  },
  {
    name: 'with a stub matcher returning matches: false, the announcement sets data-motion="full"',
    run: ({ render, screen, expect, mod }) => {
      const { Announcement } = mod as { Announcement: ComponentType<{ message: string; matchMedia?: MatchMediaFn }> };
      const stub = createMatchMediaStub(false);
      render(<Announcement message="Deploy preview is ready." matchMedia={stub.matchMedia} />);
      expect(screen.getByRole('status').getAttribute('data-motion')).to.equal('full');
    },
  },
  {
    name: "toggling the stub's change listener updates data-motion live, without remounting",
    run: async ({ render, screen, expect, act, mod }) => {
      const { Announcement } = mod as { Announcement: ComponentType<{ message: string; matchMedia?: MatchMediaFn }> };
      const stub = createMatchMediaStub(false);
      render(<Announcement message="Deploy preview is ready." matchMedia={stub.matchMedia} />);
      expect(screen.getByRole('status').getAttribute('data-motion')).to.equal('full');

      await act(async () => {
        stub.set(true);
      });
      expect(screen.getByRole('status').getAttribute('data-motion')).to.equal('reduced');

      await act(async () => {
        stub.set(false);
      });
      expect(screen.getByRole('status').getAttribute('data-motion')).to.equal('full');
    },
  },
];
