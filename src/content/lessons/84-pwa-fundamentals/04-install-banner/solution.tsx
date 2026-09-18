import { useState } from 'react';

export type FakeInstallPrompt = {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function makeFakePrompt(outcome: 'accepted' | 'dismissed'): FakeInstallPrompt {
  return {
    prompt: async () => {},
    userChoice: Promise.resolve({ outcome }),
  };
}

export type DisplayMode = 'browser' | 'standalone' | 'minimal-ui' | 'window-controls-overlay';
export type Storage = { get(key: string): unknown; set(key: string, value: unknown): void };

export type InstallBannerProps = {
  displayMode: DisplayMode;
  promptEvent: FakeInstallPrompt | null;
  onOutcome: (outcome: 'accepted' | 'dismissed') => void;
  isIOS?: boolean;
  storage: Storage;
};

export function InstallBanner({ displayMode, promptEvent, onOutcome, isIOS, storage }: InstallBannerProps) {
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);

  if (displayMode !== 'browser') return null;
  if (storage.get('install-dismissed')) return null;
  if (hidden) return null;

  if (!promptEvent) {
    if (isIOS) {
      return (
        <details data-testid="install-fallback">
          <summary>Install this app</summary>
          <p>Tap the Share icon, then &ldquo;Add to Home Screen&rdquo;.</p>
        </details>
      );
    }
    return null;
  }

  const handleClick = async () => {
    setPending(true);
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    storage.set('install-dismissed', true);
    onOutcome(outcome);
    setHidden(true);
  };

  return (
    <div data-testid="install-banner">
      <button type="button" onClick={handleClick} disabled={pending}>
        Install
      </button>
    </div>
  );
}

function makeMemoryStorage(): Storage {
  const map = new Map<string, unknown>();
  return {
    get: (key) => map.get(key),
    set: (key, value) => map.set(key, value),
  };
}

export default function App() {
  const [storage] = useState<Storage>(() => makeMemoryStorage());
  const [prompt] = useState<FakeInstallPrompt>(() => makeFakePrompt('accepted'));
  const [lastOutcome, setLastOutcome] = useState<string>('none yet');

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <InstallBanner
        displayMode="browser"
        promptEvent={prompt}
        isIOS={false}
        storage={storage}
        onOutcome={(outcome) => setLastOutcome(outcome)}
      />
      <p>Last outcome: {lastOutcome}</p>
    </div>
  );
}
