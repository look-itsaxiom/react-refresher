The sandbox can't fire a real `beforeinstallprompt` — jsdom and the preview iframe don't
implement it — so this exercise drives the same logic with a faked event shaped exactly
like the real one. Everything about the *decision tree* (when to show a button, a fallback,
or nothing) is real; only the event itself is faked.

The starter ships two things you don't need to touch:

```ts
export type FakeInstallPrompt = {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function makeFakePrompt(outcome: 'accepted' | 'dismissed'): FakeInstallPrompt;
```

`makeFakePrompt('accepted')` returns an object shaped like a captured
`beforeinstallprompt` event whose `userChoice` will resolve to that outcome once you call
`prompt()` and await it — exactly the shape the concept step's real capture pattern uses.

## `InstallBanner`

Implement `InstallBanner`, a component with this props type:

```ts
type DisplayMode = 'browser' | 'standalone' | 'minimal-ui' | 'window-controls-overlay';
type Storage = { get(key: string): unknown; set(key: string, value: unknown): void };

type InstallBannerProps = {
  displayMode: DisplayMode;
  promptEvent: FakeInstallPrompt | null;
  onOutcome: (outcome: 'accepted' | 'dismissed') => void;
  isIOS?: boolean;
  storage: Storage;
};
```

`storage` stands in for `localStorage` for this exercise — a plain object with `get`/`set`,
so a check can inspect it directly instead of touching real browser storage. Rules, checked
in this order:

1. **Already installed.** If `displayMode` is anything other than `'browser'`, render
   nothing — the app is already running standalone (or in another installed mode); never
   show an install pitch to someone already inside the installed app.
2. **Already dismissed.** If `storage.get('install-dismissed')` is truthy, render nothing,
   regardless of `promptEvent` or `isIOS`. This is what makes a dismissal persist across a
   remount with the same `storage`.
3. **No captured prompt.** If `promptEvent` is `null`:
   - and `isIOS` is `true`, render a `<details>` fallback (any accessible name/content
     is fine) that gives the user manual "Add to Home Screen" instructions — Safari never
     fires `beforeinstallprompt`, so this is the only install UX it can get.
   - otherwise, render nothing — there's no prompt to offer and no fallback instructions
     to show.
4. **A captured prompt is available.** Render an "Install" button. Clicking it should:
   - call `promptEvent.prompt()` and await it,
   - await `promptEvent.userChoice` to get `{ outcome }`,
   - call `onOutcome(outcome)`,
   - call `storage.set('install-dismissed', true)` (on *either* outcome — accepted or
     dismissed, the banner should not be offered again this "session"),
   - and stop rendering the button (any outcome hides the banner).

You choose the exact markup and test ids beyond what's necessary for the rules above; the
checks assert on rendered text and button behavior, not on specific class names.

`App` below wires `InstallBanner` up to a tiny in-memory storage object and a fake accepted
prompt so you can see it render; you shouldn't need to touch `App`.
