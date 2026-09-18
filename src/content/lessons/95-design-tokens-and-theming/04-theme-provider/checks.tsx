import type { Check } from '../../../types';
import type { ReactElement, ReactNode } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';

type ThemeStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type MediaQueryLike = {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
};
type MatchMediaFn = (query: string) => MediaQueryLike;

type ThemeProviderProps = {
  children: ReactNode;
  storage: ThemeStorage;
  matchMedia: MatchMediaFn;
  storageKey?: string;
  defaultPreference?: ThemePreference;
};

type ThemeProviderComponent = (props: ThemeProviderProps) => ReactElement;
type UseThemeHook = () => { preference: ThemePreference; resolved: 'light' | 'dark'; setPreference: (p: ThemePreference) => void };
type NoFlashScriptFn = (storageKey: string) => string;

function createFakeStorage(initial: Record<string, string> = {}): ThemeStorage & { snapshot(): Record<string, string> } {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    snapshot: () => Object.fromEntries(store),
  };
}

function createFakeMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const mql: MediaQueryLike = {
    get matches() {
      return matches;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
  };
  const matchMedia: MatchMediaFn = () => mql;
  return {
    matchMedia,
    trigger(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

export const checks: Check[] = [
  {
    name: 'with no stored preference, resolves "system" from the injected matchMedia',
    run: async ({ mod, render, within, expect, act }) => {
      const ThemeProvider = mod.ThemeProvider as ThemeProviderComponent;
      const storage = createFakeStorage();
      const { matchMedia } = createFakeMatchMedia(true); // OS says dark
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(
          <ThemeProvider storage={storage} matchMedia={matchMedia}>
            <p>hi</p>
          </ThemeProvider>,
        ));
      });
      const root = within(container).getByTestId('theme-root');
      expect(root.getAttribute('data-theme')).to.equal('dark');
    },
  },
  {
    name: 'an explicit stored preference wins over what the system media query reports',
    run: async ({ mod, render, within, expect, act }) => {
      const ThemeProvider = mod.ThemeProvider as ThemeProviderComponent;
      const storage = createFakeStorage({ 'theme-preference': 'light' });
      const { matchMedia } = createFakeMatchMedia(true); // OS says dark, should be ignored
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(
          <ThemeProvider storage={storage} matchMedia={matchMedia}>
            <p>hi</p>
          </ThemeProvider>,
        ));
      });
      const root = within(container).getByTestId('theme-root');
      expect(root.getAttribute('data-theme')).to.equal('light');
      expect((root as HTMLElement).style.colorScheme).to.equal('light');
    },
  },
  {
    name: 'setPreference persists to storage and updates the resolved theme',
    run: async ({ mod, render, within, user, expect, act }) => {
      const ThemeProvider = mod.ThemeProvider as ThemeProviderComponent;
      const useTheme = mod.useTheme as UseThemeHook;
      function Consumer() {
        const { setPreference } = useTheme();
        return <button onClick={() => setPreference('dark')}>go dark</button>;
      }
      const storage = createFakeStorage();
      const { matchMedia } = createFakeMatchMedia(false);
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(
          <ThemeProvider storage={storage} matchMedia={matchMedia} storageKey="my-theme">
            <Consumer />
          </ThemeProvider>,
        ));
      });
      await user.click(within(container).getByRole('button', { name: /go dark/i }));
      const root = within(container).getByTestId('theme-root');
      expect(root.getAttribute('data-theme')).to.equal('dark');
      expect(storage.snapshot()['my-theme']).to.equal('dark');
    },
  },
  {
    name: 'while preference is "system", a matchMedia change event updates the resolved theme live',
    run: async ({ mod, render, within, expect, act }) => {
      const ThemeProvider = mod.ThemeProvider as ThemeProviderComponent;
      const storage = createFakeStorage();
      const fake = createFakeMatchMedia(false);
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(
          <ThemeProvider storage={storage} matchMedia={fake.matchMedia}>
            <p>hi</p>
          </ThemeProvider>,
        ));
      });
      expect(within(container).getByTestId('theme-root').getAttribute('data-theme')).to.equal('light');
      await act(async () => {
        fake.trigger(true);
      });
      expect(within(container).getByTestId('theme-root').getAttribute('data-theme')).to.equal('dark');
    },
  },
  {
    name: 'useTheme() throws when called outside a ThemeProvider',
    run: async ({ mod, render, within, expect, act }) => {
      const useTheme = mod.useTheme as UseThemeHook;
      function Lonely() {
        let caught: string | null = null;
        try {
          useTheme();
        } catch (error) {
          caught = error instanceof Error ? error.message : String(error);
        }
        return <div data-testid="lonely-result">{caught ?? 'no-error'}</div>;
      }
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<Lonely />));
      });
      const result = within(container).getByTestId('lonely-result').textContent ?? '';
      expect(result, 'expected useTheme() outside a provider to throw').to.not.equal('no-error');
    },
  },
  {
    name: 'noFlashScript() references the storage key, matchMedia, data-theme, and never document.write',
    run: async ({ mod, expect }) => {
      const noFlashScript = mod.noFlashScript as NoFlashScriptFn;
      const script = noFlashScript('acme-theme');
      expect(script).to.include('acme-theme');
      expect(script).to.include('matchMedia');
      expect(script).to.include('data-theme');
      expect(script).to.not.include('document.write');
    },
  },
];
