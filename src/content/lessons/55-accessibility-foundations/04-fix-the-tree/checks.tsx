import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the page content is wrapped in a <main> landmark',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('main')).to.exist;
    },
  },
  {
    name: 'the top links are wrapped in a <nav> landmark, with real, focusable links',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('navigation'), 'expected a <nav> landmark').to.exist;

      const links = screen.getAllByRole('link');
      const names = links.map((link) => link.textContent);
      expect(names).to.include.members(['Home', 'Pricing', 'Contact']);
      links.forEach((link) => {
        expect(link.tagName, `"${link.textContent}" should be a real <a> element`).to.equal('A');
        expect(link.getAttribute('href'), `"${link.textContent}" needs a non-empty href`)
          .to.be.a('string')
          .and.not.equal('');
      });
    },
  },
  {
    name: 'the heading hierarchy goes h1 then h2, with no level skipped',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const headings = screen.getAllByRole('heading');
      const levels = headings.map((h) => Number(h.tagName.slice(1)));
      expect(levels).to.deep.equal([1, 2]);
    },
  },
  {
    name: '"Sign up free" is a real, focusable <button>',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: 'Sign up free' });
      expect(button.tagName).to.equal('BUTTON');
    },
  },
  {
    name: 'exactly one image is exposed with the img role, with a real accessible name',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const images = screen.getAllByRole('img');
      expect(images, 'a purely decorative image with alt="" should not appear here').to.have.lengthOf(1);
      expect(images[0]!.getAttribute('alt'), 'the remaining image needs real, descriptive alt text')
        .to.be.a('string')
        .and.not.equal('');
    },
  },
  {
    name: 'the decorative swoosh keeps alt="" rather than no alt attribute at all',
    run: ({ render, expect, Component }) => {
      render(<Component />);
      const swoosh = document.querySelector('img[src="/decorative-swoosh.png"]');
      expect(swoosh, 'expected the decorative swoosh <img> to still be in the DOM').to.exist;
      expect(swoosh!.getAttribute('alt'), 'a purely decorative image should have alt="", not a missing attribute').to.equal('');
    },
  },
  {
    name: 'the internal build note is hidden from assistive tech, not just visually hidden',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const note = screen.getByText(/Internal build 4\.7\.2/);
      const inaccessible = note.hidden || note.closest('[aria-hidden="true"]') !== null;
      expect(
        inaccessible,
        'use the `hidden` attribute or `aria-hidden="true"`, not opacity, to hide non-visual content from assistive tech',
      ).to.equal(true);
    },
  },
];
