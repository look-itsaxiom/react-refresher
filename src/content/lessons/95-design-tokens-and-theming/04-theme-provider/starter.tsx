import { createContext, useContext, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeResolved = 'light' | 'dark';

export type ThemeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type MediaQueryLike = {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
};
export type MatchMediaFn = (query: string) => MediaQueryLike;

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ThemeResolved;
  setPreference: (preference: ThemePreference) => void;
};

export type ThemeProviderProps = {
  children: ReactNode;
  storage: ThemeStorage;
  matchMedia: MatchMediaFn;
  storageKey?: string;
  defaultPreference?: ThemePreference;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// TODO: implement.
//
// - Read the initial preference from `storage.getItem(storageKey ?? 'theme-preference')`;
//   fall back to `defaultPreference ?? 'system'` when nothing valid is stored.
// - Derive `resolved` from `preference` — 'system' asks `matchMedia('(prefers-color-scheme: dark)')`.
// - While preference is 'system', subscribe to that query's 'change' event and update
//   `resolved` live; unsubscribe on cleanup.
// - `setPreference` should update state AND call `storage.setItem`.
// - Render a wrapper with `data-testid="theme-root"`, `data-theme={resolved}`, and
//   `style.colorScheme` set to `resolved`, around `children`.
export function ThemeProvider(props: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{ preference: 'light', resolved: 'light', setPreference: () => {} }}>
      <div data-testid="theme-root" data-theme="light">
        {props.children}
      </div>
    </ThemeContext.Provider>
  );
}

// TODO: implement. Throw when there's no enclosing <ThemeProvider>.
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return ctx as ThemeContextValue;
}

// TODO: implement. Return an inline-script string (see prompt.md for the requirements).
export function noFlashScript(storageKey: string): string {
  void storageKey;
  return '';
}

function ThemeSwitcher() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <div>
      <p>
        Preference: {preference} (resolved: {resolved})
      </p>
      <button onClick={() => setPreference('system')}>System</button>
      <button onClick={() => setPreference('light')}>Light</button>
      <button onClick={() => setPreference('dark')}>Dark</button>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider storage={window.localStorage} matchMedia={(q) => window.matchMedia(q)}>
      <ThemeSwitcher />
    </ThemeProvider>
  );
}
