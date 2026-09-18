import type { Check } from '../../../types';

// react-dom's resource-hint registry is global to the document (and, once a href has been
// registered, calling preload()/preinit() again for that href is a permanent no-op for the
// life of the module) — it isn't reset between checks the way rendered DOM is. Each check
// removes any stale <link> for the href it's about to assert on, so a leftover element from
// an earlier check (e.g. the starter run after the solution run) can't produce a false pass.
function forgetPreload(href: string) {
  document.head.querySelector(`link[rel="preload"][href="${href}"]`)?.remove();
}

export const checks: Check[] = [
  {
    name: 'preloads the hovered product\'s image as a <link rel="preload" as="image">',
    run: async ({ render, screen, user, expect, Component }) => {
      forgetPreload('/images/1.jpg');
      render(<Component />);
      await user.hover(screen.getByRole('link', { name: 'Widget' }));
      const link = document.head.querySelector('link[rel="preload"][href="/images/1.jpg"]');
      expect(link, 'expected a preload link for /images/1.jpg after hovering Widget').to.not.equal(null);
      expect(link!.getAttribute('as')).to.equal('image');
    },
  },
  {
    name: 'preloads the correct image for each product, not just the first',
    run: async ({ render, screen, user, expect, Component }) => {
      forgetPreload('/images/3.jpg');
      render(<Component />);
      await user.hover(screen.getByRole('link', { name: 'Doohickey' }));
      const link = document.head.querySelector('link[rel="preload"][href="/images/3.jpg"]');
      expect(link, 'expected a preload link for /images/3.jpg after hovering Doohickey').to.not.equal(null);
      expect(link!.getAttribute('as')).to.equal('image');
    },
  },
  {
    name: 'hovering the same link twice does not add a duplicate preload link',
    run: async ({ render, screen, user, expect, Component }) => {
      forgetPreload('/images/2.jpg');
      render(<Component />);
      await user.hover(screen.getByRole('link', { name: 'Gadget' }));
      await user.unhover(screen.getByRole('link', { name: 'Gadget' }));
      await user.hover(screen.getByRole('link', { name: 'Gadget' }));
      const links = document.head.querySelectorAll('link[rel="preload"][href="/images/2.jpg"]');
      expect(links.length, 'React dedupes repeated preload calls for the same href').to.equal(1);
    },
  },
];
