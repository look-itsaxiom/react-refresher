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

// TODO: check each capability by key presence and assign a tier.
export function capabilityTiers(platform: FakePlatform, manifest: Record<string, unknown>): Tiers {
  void platform;
  void manifest;
  return { tier: 'baseline', available: [], missing: [], hints: [] };
}

// TODO: try share() when canShare() allows it, fall back to clipboard, then 'unsupported'.
export async function shareOrCopy(
  platform: FakePlatform,
  data: ShareData,
): Promise<'shared' | 'copied' | 'cancelled' | 'unsupported'> {
  void platform;
  void data;
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
