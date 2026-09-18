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

// TODO: implement the four rules from the prompt, in order:
// 1. displayMode !== 'browser' -> render nothing.
// 2. storage.get('install-dismissed') truthy -> render nothing.
// 3. promptEvent === null -> isIOS ? render a fallback : render nothing.
// 4. promptEvent present -> render an Install button; on click, prompt(), await
//    userChoice, onOutcome(outcome), storage.set('install-dismissed', true), then hide.
export function InstallBanner(_props: InstallBannerProps) {
  return null;
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
