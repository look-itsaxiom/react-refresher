import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'both <nav>s have distinguishing accessible names',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('navigation', { name: 'Primary' }), 'expected a nav named "Primary"').to.exist;
      expect(screen.getByRole('navigation', { name: 'Footer' }), 'expected a nav named "Footer"').to.exist;
    },
  },
  {
    name: 'the "Related guides" section is named and exposed as a region landmark',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const region = screen.getByRole('region', { name: 'Related guides' });
      expect(region.tagName, 'expected a <section>, named via aria-labelledby').to.equal('SECTION');
    },
  },
  {
    name: 'heading levels go h1, h2, h2 — no level skipped',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const headings = screen.getAllByRole('heading');
      const levels = headings.map((h) => Number(h.tagName.slice(1)));
      expect(levels, 'expected the page heading, the section heading, and the main heading in that order').to.deep.equal([1, 2, 2]);
    },
  },
  {
    name: 'the related-guides list keeps explicit list semantics',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const list = screen.getByRole('list');
      expect(list.getAttribute('role'), 'add role="list" explicitly rather than relying on the implicit <ul> role').to.equal('list');
    },
  },
  {
    name: 'activating the skip link moves keyboard focus onto <main>',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);

      await user.tab();
      expect(document.activeElement?.textContent, 'expected the skip link to be the first focusable element').to.match(/skip to content/i);

      await user.keyboard('{Enter}');

      const main = screen.getByRole('main');
      expect(document.activeElement, 'expected focus to land on <main> after activating the skip link').to.equal(main);
    },
  },
];
