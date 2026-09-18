import { useState } from 'react';

export type ShareData = { title?: string; text?: string; url?: string };

export type FakePlatform = {
  navigator: {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
    clipboard?: { writeText: (text: string) => Promise<void> };
    setAppBadge?: () => Promise<void>;
    serviceWorker?: unknown;
    [key: string]: unknown;
  };
  window: {
    launchQueue?: unknown;
    PushManager?: unknown;
    [key: string]: unknown;
  };
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
};

export type Tiers = {
  tier: 'baseline' | 'installed' | 'enhanced';
  available: string[];
  missing: string[];
  hints: string[];
};

/** Builds a fake platform for the live preview. Real navigator/window support don't exist here. */
export function makeFakePlatform(overrides: Partial<FakePlatform> = {}): FakePlatform {
  return {
    navigator: {
      share: async () => {},
      canShare: () => true,
      clipboard: { writeText: async () => {} },
      setAppBadge: async () => {},
      serviceWorker: {},
    },
    window: { launchQueue: {}, PushManager: {} },
    displayMode: 'standalone',
    ...overrides,
  };
}

const CAPABILITY_CHECKS: Array<{ key: string; test: (platform: FakePlatform) => boolean }> = [
  { key: 'share', test: (p) => 'share' in p.navigator },
  { key: 'setAppBadge', test: (p) => 'setAppBadge' in p.navigator },
  { key: 'launchQueue', test: (p) => 'launchQueue' in p.window },
  { key: 'PushManager', test: (p) => 'PushManager' in p.window },
  { key: 'serviceWorker', test: (p) => 'serviceWorker' in p.navigator },
];

export function capabilityTiers(platform: FakePlatform, manifest: Record<string, unknown>): Tiers {
  const available = CAPABILITY_CHECKS.filter((c) => c.test(platform)).map((c) => c.key);
  const missing = CAPABILITY_CHECKS.filter((c) => !c.test(platform)).map((c) => c.key);

  const tier: Tiers['tier'] =
    platform.displayMode === 'browser' ? 'baseline' : available.length >= 3 ? 'enhanced' : 'installed';

  const hints: string[] = [];

  if (manifest.share_target && !available.includes('serviceWorker')) {
    hints.push('share_target is declared but no service worker is registered; Share Target needs an active service worker.');
  }

  const fileHandlers = manifest.file_handlers;
  if (Array.isArray(fileHandlers) && fileHandlers.length > 0 && !available.includes('launchQueue')) {
    hints.push('file_handlers is declared but launchQueue is not available; File Handling needs Chromium’s launchQueue API.');
  }

  if (manifest.display === 'standalone' && platform.displayMode === 'browser') {
    hints.push('The manifest requests standalone display, but the app is not installed; install-gated capabilities are unavailable until then.');
  }

  return { tier, available, missing, hints };
}

export async function shareOrCopy(
  platform: FakePlatform,
  data: ShareData,
): Promise<'shared' | 'copied' | 'cancelled' | 'unsupported'> {
  const { navigator } = platform;
  if (navigator.canShare && navigator.share && navigator.canShare(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      throw err;
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(data.url ?? data.text ?? '');
    return 'copied';
  }

  return 'unsupported';
}

export default function App() {
  const [platform] = useState(() => makeFakePlatform());
  const result = capabilityTiers(platform, { share_target: {}, display: 'standalone' });
  return (
    <div>
      <p>Tier: {result.tier}</p>
      <p>Available: {result.available.join(', ') || 'none'}</p>
      <button
        type="button"
        onClick={() => shareOrCopy(platform, { title: 'Demo', url: 'https://example.com' })}
      >
        Share
      </button>
    </div>
  );
}
