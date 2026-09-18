import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

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

const DEFAULT_STORAGE_KEY = 'theme-preference';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveFromMedia(matchMedia: MatchMediaFn): ThemeResolved {
  return matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function isExplicitPreference(value: string | null): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

export function ThemeProvider(props: ThemeProviderProps) {
  const { children, storage, matchMedia, defaultPreference = 'system' } = props;
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY;

  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = storage.getItem(storageKey);
    if (isExplicitPreference(stored)) return stored;
    if (stored === 'system') return 'system';
    return defaultPreference;
  });

  const [resolved, setResolved] = useState<ThemeResolved>(() =>
    preference === 'system' ? resolveFromMedia(matchMedia) : preference,
  );

  useEffect(() => {
    if (preference !== 'system') {
      setResolved(preference);
      return;
    }
    const query = matchMedia(DARK_QUERY);
    setResolved(query.matches ? 'dark' : 'light');
    const onChange = (event: { matches: boolean }) => {
      setResolved(event.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference, matchMedia]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      storage.setItem(storageKey, next);
      setPreferenceState(next);
    },
    [storage, storageKey],
  );

  const value: ThemeContextValue = { preference, resolved, setPreference };

  return (
    <ThemeContext.Provider value={value}>
      <div data-testid="theme-root" data-theme={resolved} style={{ colorScheme: resolved }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be called within a <ThemeProvider>');
  }
  return ctx;
}

export function noFlashScript(storageKey: string): string {
  return `(function () {
  try {
    var key = ${JSON.stringify(storageKey)};
    var stored = localStorage.getItem(key);
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();`;
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
