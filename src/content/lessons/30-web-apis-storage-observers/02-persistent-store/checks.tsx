import type { Check } from '../../../types';

const STORE_KEY = 'lesson30-counter-store';

export const checks: Check[] = [
  {
    name: 'writes the new value to storage on every update, not just to memory',
    run: async (ctx) => {
      window.localStorage.removeItem(STORE_KEY);
      const { render, screen, expect, act, Component } = ctx;
      render(<Component />);
      const button = screen.getByRole('button', { name: /increment/i });
      await act(async () => {
        button.click();
        button.click();
        button.click();
      });
      expect(screen.getByTestId('value').textContent).to.include('3');
      const raw = window.localStorage.getItem(STORE_KEY);
      expect(raw, 'expected the store to write something to storage').to.not.equal(null);
      const parsed = JSON.parse(raw as string) as { version: number; data: { count: number } };
      expect(parsed.data.count, 'the serialized data should match what is on screen').to.equal(3);
    },
  },
  {
    name: 'reads an existing value from storage on mount, as if the page had just reloaded',
    run: async (ctx) => {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ version: 2, data: { count: 42 } }));
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.getByTestId('value').textContent).to.include('42');
      expect(screen.getByTestId('value-secondary').textContent).to.include('42');
    },
  },
  {
    name: 'migrates an old-version payload using the provided migrate function',
    run: async (ctx) => {
      // v1 stored a bare number where v2 stores { count }.
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, data: 7 }));
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.getByTestId('value').textContent).to.include('7');
    },
  },
  {
    name: 'falls back to the initial value when the stored JSON is corrupt',
    run: async (ctx) => {
      window.localStorage.setItem(STORE_KEY, '{not valid json at all');
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.getByTestId('value').textContent).to.include('0');
    },
  },
  {
    name: 'a second component using the same store updates when another tab writes to storage',
    run: async (ctx) => {
      window.localStorage.removeItem(STORE_KEY);
      const { render, screen, expect, act, Component } = ctx;
      render(<Component />);
      expect(screen.getByTestId('value').textContent).to.include('0');
      expect(screen.getByTestId('value-secondary').textContent).to.include('0');

      await act(async () => {
        const newValue = JSON.stringify({ version: 2, data: { count: 9 } });
        window.localStorage.setItem(STORE_KEY, newValue);
        window.dispatchEvent(
          new StorageEvent('storage', { key: STORE_KEY, newValue, storageArea: window.localStorage }),
        );
      });

      expect(screen.getByTestId('value').textContent, 'primary display after a cross-tab write').to.include('9');
      expect(
        screen.getByTestId('value-secondary').textContent,
        'secondary display after a cross-tab write',
      ).to.include('9');
    },
  },
];
