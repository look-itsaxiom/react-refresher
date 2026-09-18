import type { Check } from '../../../types';
import type { ComponentType } from 'react';

type CounterProps = { initialCount: number };
type Mod = {
  Counter: ComponentType<CounterProps>;
  renderPage: (App: ComponentType<any>, props: Record<string, unknown>) => string;
  hydrate: (container: HTMLElement, onRecoverableError?: (error: unknown) => void) => void;
};

export const checks: Check[] = [
  {
    name: 'renderPage produces a #root element with the rendered markup and a #__PROPS__ script with the JSON props',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { Counter, renderPage } = mod as unknown as Mod;
      const html = renderPage(Counter, { initialCount: 7 });

      expect(html).to.include('id="root"');
      expect(html).to.include('Count: 7');

      const scriptMatch = html.match(/<script id="__PROPS__"[^>]*>([\s\S]*?)<\/script>/);
      expect(scriptMatch, 'expected a <script id="__PROPS__"> tag').to.not.equal(null);
      const rawJsonText: string = scriptMatch![1] ?? '';
      const parsed = JSON.parse(rawJsonText);
      expect(parsed).to.deep.equal({ initialCount: 7 });
    },
  },
  {
    name: 'a "<" character in a prop value is escaped in the embedded JSON so it cannot close the script tag early',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { Counter, renderPage } = mod as unknown as Mod;
      const evil = '</script><script>window.pwned = true;</script>';
      const html = renderPage(Counter, { initialCount: 1, evil } as unknown as Record<string, unknown>);

      const scriptMatch = html.match(/<script id="__PROPS__"[^>]*>([\s\S]*?)<\/script>/);
      expect(scriptMatch, 'expected a <script id="__PROPS__"> tag').to.not.equal(null);
      const rawJsonText: string = scriptMatch![1] ?? '';

      // The raw text inside the script tag must contain no literal "<" at all.
      expect(rawJsonText).to.not.include('<');

      // But the original value must still be recoverable after JSON.parse.
      const parsed = JSON.parse(rawJsonText);
      expect(parsed.evil).to.equal(evil);
    },
  },
  {
    name: 'hydrate reuses the existing DOM nodes instead of replacing them',
    run: async (ctx) => {
      const { mod, expect, act } = ctx;
      const { Counter, renderPage, hydrate } = mod as unknown as Mod;

      const html = renderPage(Counter, { initialCount: 3 });
      const container = document.createElement('div');
      container.innerHTML = html;

      const nodeBeforeHydration = container.querySelector('[data-testid="count"]');
      expect(nodeBeforeHydration, 'expected server-rendered markup to include the count element').to.not.equal(null);

      let errorCount = 0;
      await act(async () => {
        hydrate(container, () => {
          errorCount += 1;
        });
      });

      const nodeAfterHydration = container.querySelector('[data-testid="count"]');
      expect(errorCount, 'hydration produced a recoverable error — markup mismatch').to.equal(0);
      expect(nodeAfterHydration).to.equal(nodeBeforeHydration);
      expect(nodeAfterHydration?.textContent).to.equal('Count: 3');
    },
  },
  {
    name: 'the counter button works after hydration',
    run: async (ctx) => {
      const { mod, expect, act } = ctx;
      const { Counter, renderPage, hydrate } = mod as unknown as Mod;

      const html = renderPage(Counter, { initialCount: 0 });
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);

      try {
        await act(async () => {
          hydrate(container);
        });

        const button = container.querySelector('button');
        expect(button, 'expected a button in the hydrated markup').to.not.equal(null);

        await act(async () => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(container.querySelector('[data-testid="count"]')?.textContent).to.equal('Count: 1');
      } finally {
        document.body.removeChild(container);
      }
    },
  },
];
