import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'sets document.title and a description meta tag on first render',
    run: async ({ render, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      expect(document.title).to.equal('Widget · Store');
      const meta = document.head.querySelector('meta[name="description"]');
      expect(meta, 'expected a <meta name="description"> in <head>').to.not.equal(null);
      expect(meta!.getAttribute('content')).to.match(/Widget/);
    },
  },
  {
    name: 'updates title and meta, without leaving a duplicate, when switching products',
    run: async ({ render, screen, user, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      await user.click(screen.getByRole('button', { name: 'Switch product' }));
      expect(document.title).to.equal('Gadget · Store');
      const metas = document.head.querySelectorAll('meta[name="description"]');
      expect(metas.length, 'expected exactly one description meta tag after switching').to.equal(1);
      expect(metas[0]!.getAttribute('content')).to.match(/Gadget/);
    },
  },
  {
    name: 'removes the title and meta tag when the page unmounts',
    run: async ({ render, expect, act, Component }) => {
      const { unmount } = render(<Component />);
      await act(async () => {});
      unmount();
      await act(async () => {});
      expect(document.title, 'title should be cleared after unmount').to.equal('');
      expect(
        document.head.querySelector('meta[name="description"]'),
        'the description meta tag should be removed after unmount',
      ).to.equal(null);
    },
  },
];
