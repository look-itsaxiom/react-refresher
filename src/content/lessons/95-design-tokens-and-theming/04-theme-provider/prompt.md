Build the runtime half of a theme system: a `ThemeProvider`/`useTheme` pair that keeps
the user's **preference** (`system` | `light` | `dark`) separate from the **resolved**
theme (`light` | `dark`) that actually gets painted, plus the inline script that avoids a
flash of the wrong theme before React hydrates.

There's no real browser here, so `ThemeProvider` takes `storage` and `matchMedia` as
**props** instead of reading `localStorage`/`window.matchMedia` directly — that's what
makes it testable, and it's a legitimate pattern for real code too (inject the platform
API, don't reach for the global).

## Types

```ts
type ThemePreference = 'system' | 'light' | 'dark';
type ThemeResolved = 'light' | 'dark';

type ThemeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type MediaQueryLike = {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
};
type MatchMediaFn = (query: string) => MediaQueryLike;

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ThemeResolved;
  setPreference: (preference: ThemePreference) => void;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  storage: ThemeStorage;
  matchMedia: MatchMediaFn;
  storageKey?: string; // default: 'theme-preference'
  defaultPreference?: ThemePreference; // default: 'system'
};
```

## `ThemeProvider`

- On first render, read `storage.getItem(storageKey)`. If it's `'light'` or `'dark'`, use
  it as the initial preference. Otherwise use `props.defaultPreference ?? 'system'`.
- `resolved` is derived from `preference`: `'light'`/`'dark'` pass through unchanged;
  `'system'` resolves via `matchMedia('(prefers-color-scheme: dark)').matches` (`true` →
  `'dark'`, `false` → `'light'`).
- While `preference === 'system'`, subscribe to that `MediaQueryList`'s `'change'` event
  and update `resolved` when it fires. Unsubscribe when `preference` changes away from
  `'system'` or the component unmounts — don't leak listeners.
- `setPreference(next)` updates state and calls `storage.setItem(storageKey, next)`.
- Render a wrapper element with `data-testid="theme-root"`, `data-theme={resolved}`, and
  `style.colorScheme` set to `resolved`, containing `children`. (A real app sets these on
  `<html>` instead of a wrapper `<div>` — this lesson scopes it to a wrapper so the checks
  don't have to touch `document.documentElement`.)
- Provide `{ preference, resolved, setPreference }` through context.

## `useTheme()`

Reads the context. Throw a clear `Error` if called outside a `ThemeProvider`.

## `noFlashScript(storageKey)`

Returns a **string** of inline JavaScript (not JSX, not a React component) meant to be
placed in a `<script>` tag in `<head>`, before the app's bundle loads. It should:
- Reference `storageKey` (the actual key, not a placeholder).
- Read that key from `localStorage` and fall back to `matchMedia('(prefers-color-scheme: dark)')`
  when nothing valid is stored.
- Set `data-theme` on `document.documentElement`.
- Never call `document.write`.

The starter ships a small demo `App` using `ThemeProvider` with real
`localStorage`/`window.matchMedia` so you can see it work in the preview; the checks
exercise `ThemeProvider` directly with fakes, not that demo.
