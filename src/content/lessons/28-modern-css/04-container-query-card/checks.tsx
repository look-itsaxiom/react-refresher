import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders the wrapper and cards with their expected test ids and classes',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const grid = container.querySelector('[data-testid="card-grid"]');
      expect(grid, 'expected the card-grid wrapper').to.not.equal(null);
      expect(grid!.classList.contains('card-grid')).to.equal(true);
      const cards = container.querySelectorAll('[data-testid="card"]');
      expect(cards.length).to.equal(3);
      const withImage = Array.from(cards).find((c) => c.querySelector('img'));
      expect(withImage, 'expected at least one card with an <img>').to.not.equal(undefined);
    },
  },
  {
    name: '.card-grid opts into being a query container',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const css = container.querySelector('style')?.textContent ?? '';
      const gridRule = css.match(/\.card-grid\s*\{[^}]*\}/);
      expect(gridRule, 'expected a .card-grid rule').to.not.equal(null);
      expect(gridRule![0]).to.match(/container-type\s*:\s*inline-size/);
    },
  },
  {
    name: 'an @container rule changes grid-template-columns at a min-width condition',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const css = container.querySelector('style')?.textContent ?? '';
      const containerBlock = css.match(/@container\s*\(\s*min-width\s*:\s*[^)]+\)\s*\{[\s\S]*?\}\s*\}/);
      expect(containerBlock, 'expected an @container (min-width: ...) { ... } block').to.not.equal(null);
      expect(containerBlock![0]).to.match(/grid-template-columns\s*:/);
    },
  },
  {
    name: 'a .card:has(img) rule styles cards that contain an image',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const css = container.querySelector('style')?.textContent ?? '';
      expect(css).to.match(/\.card:has\(\s*img\s*\)\s*\{[^}]+\}/);
    },
  },
  {
    name: 'the stylesheet declares a layer order with @layer',
    run: async ({ render, expect, act, Component }) => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Component />));
      });
      const css = container.querySelector('style')?.textContent ?? '';
      expect(css).to.match(/@layer\s+[\w-]+(\s*,\s*[\w-]+)+\s*;/);
    },
  },
];
