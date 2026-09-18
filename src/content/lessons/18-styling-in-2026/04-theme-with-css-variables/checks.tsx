import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'a wrapper element carries data-theme, defaulting to light',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const themed = container.querySelector('[data-theme]');
      expect(themed, 'expected an element with a data-theme attribute').to.not.equal(null);
      expect(themed!.getAttribute('data-theme')).to.equal('light');
    },
  },
  {
    name: 'clicking "Toggle theme" updates data-theme to dark',
    run: async ({ render, screen, user, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      await user.click(screen.getByRole('button', { name: /toggle theme/i }));
      const themed = container.querySelector('[data-theme]');
      expect(themed, 'expected an element with a data-theme attribute').to.not.equal(null);
      expect(themed!.getAttribute('data-theme')).to.equal('dark');
    },
  },
  {
    name: "the card's inline style reads its colors from CSS variables, not literal values",
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const card = container.querySelector('[data-testid="card"]');
      expect(card, 'expected the card element').to.not.equal(null);
      const style = card!.getAttribute('style') ?? '';
      expect(style).to.match(/var\(\s*--card-bg\s*\)/);
      expect(style).to.match(/var\(\s*--card-fg\s*\)/);
    },
  },
  {
    name: 'the <style> tag defines --card-bg and --card-fg for both light and dark',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const style = container.querySelector('style');
      expect(style, 'expected a <style> tag rendered by the component').to.not.equal(null);
      const css = style!.textContent ?? '';
      expect(css, 'missing a [data-theme="light"] block defining --card-bg').to.match(
        /\[data-theme=("|')?light("|')?\][^}]*--card-bg/,
      );
      expect(css, 'missing a [data-theme="dark"] block defining --card-bg').to.match(
        /\[data-theme=("|')?dark("|')?\][^}]*--card-bg/,
      );
      expect(css).to.match(/--card-fg/);
    },
  },
];
