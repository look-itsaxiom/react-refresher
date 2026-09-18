import type { Check } from '../../../types';

type ShareData = { title?: string; text?: string; url?: string };

type FakePlatform = {
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

type Tiers = {
  tier: 'baseline' | 'installed' | 'enhanced';
  available: string[];
  missing: string[];
  hints: string[];
};

type Mod = {
  capabilityTiers: (platform: FakePlatform, manifest: Record<string, unknown>) => Tiers;
  shareOrCopy: (
    platform: FakePlatform,
    data: ShareData,
  ) => Promise<'shared' | 'copied' | 'cancelled' | 'unsupported'>;
};

function abortError(): Error {
  const err = new Error('The user aborted the share.');
  err.name = 'AbortError';
  return err;
}

export const checks: Check[] = [
  {
    name: 'an uninstalled tab with every API present is still baseline, not enhanced',
    run: ({ mod, expect }) => {
      const { capabilityTiers } = mod as Mod;
      const platform: FakePlatform = {
        navigator: { share: async () => {}, canShare: () => true, setAppBadge: async () => {}, serviceWorker: {} },
        window: { launchQueue: {}, PushManager: {} },
        displayMode: 'browser',
      };
      const result = capabilityTiers(platform, {});
      expect(result.tier, 'not installed always means baseline').to.equal('baseline');
      expect(result.available).to.include.members(['share', 'setAppBadge', 'launchQueue', 'PushManager', 'serviceWorker']);
      expect(result.missing).to.deep.equal([]);
    },
  },
  {
    name: 'installed with fewer than three capabilities is the installed tier, not enhanced',
    run: ({ mod, expect }) => {
      const { capabilityTiers } = mod as Mod;
      const platform: FakePlatform = {
        navigator: { serviceWorker: {} },
        window: {},
        displayMode: 'standalone',
      };
      const result = capabilityTiers(platform, {});
      expect(result.available).to.deep.equal(['serviceWorker']);
      expect(result.missing).to.include.members(['share', 'setAppBadge', 'launchQueue', 'PushManager']);
      expect(result.tier).to.equal('installed');
    },
  },
  {
    name: 'installed with three or more capabilities reaches the enhanced tier',
    run: ({ mod, expect }) => {
      const { capabilityTiers } = mod as Mod;
      const platform: FakePlatform = {
        navigator: { share: async () => {}, serviceWorker: {} },
        window: { PushManager: {} },
        displayMode: 'minimal-ui',
      };
      const result = capabilityTiers(platform, {});
      expect(result.available).to.have.length(3);
      expect(result.tier).to.equal('enhanced');
    },
  },
  {
    name: 'flags share_target declared without a service worker, but not when serviceWorker is present',
    run: ({ mod, expect }) => {
      const { capabilityTiers } = mod as Mod;
      const withoutSw = capabilityTiers(
        { navigator: {}, window: {}, displayMode: 'standalone' },
        { share_target: { action: '/share' } },
      );
      expect(withoutSw.hints.some((h) => /share_target/i.test(h) && /service worker/i.test(h))).to.equal(true);

      const withSw = capabilityTiers(
        { navigator: { serviceWorker: {} }, window: {}, displayMode: 'standalone' },
        { share_target: { action: '/share' } },
      );
      expect(withSw.hints.some((h) => /share_target/i.test(h))).to.equal(false);
    },
  },
  {
    name: 'flags file_handlers declared without launchQueue, and flags a standalone manifest that is not installed',
    run: ({ mod, expect }) => {
      const { capabilityTiers } = mod as Mod;
      const fileHandlerResult = capabilityTiers(
        { navigator: {}, window: {}, displayMode: 'standalone' },
        { file_handlers: [{ action: '/open', accept: {} }] },
      );
      expect(fileHandlerResult.hints.some((h) => /launchQueue/i.test(h))).to.equal(true);

      const notInstalledResult = capabilityTiers(
        { navigator: {}, window: {}, displayMode: 'browser' },
        { display: 'standalone' },
      );
      expect(notInstalledResult.hints.some((h) => /not installed|isn.t installed/i.test(h))).to.equal(true);
    },
  },
  {
    name: 'shareOrCopy shares when canShare allows it, and reports cancellation instead of throwing on AbortError',
    run: async ({ mod, expect }) => {
      const { shareOrCopy } = mod as Mod;
      const shared = await shareOrCopy(
        { navigator: { canShare: () => true, share: async () => {} }, window: {}, displayMode: 'standalone' },
        { url: 'https://example.com' },
      );
      expect(shared).to.equal('shared');

      const cancelled = await shareOrCopy(
        {
          navigator: {
            canShare: () => true,
            share: async () => {
              throw abortError();
            },
          },
          window: {},
          displayMode: 'standalone',
        },
        { url: 'https://example.com' },
      );
      expect(cancelled).to.equal('cancelled');
    },
  },
  {
    name: 'shareOrCopy falls back to the clipboard when share is unavailable or canShare declines, and reports unsupported otherwise',
    run: async ({ mod, expect }) => {
      const { shareOrCopy } = mod as Mod;
      let written = '';
      const copied = await shareOrCopy(
        { navigator: { clipboard: { writeText: async (text) => { written = text; } } }, window: {}, displayMode: 'standalone' },
        { url: 'https://example.com/thing' },
      );
      expect(copied).to.equal('copied');
      expect(written).to.equal('https://example.com/thing');

      const declinedButCopied = await shareOrCopy(
        {
          navigator: {
            canShare: () => false,
            share: async () => {},
            clipboard: { writeText: async () => {} },
          },
          window: {},
          displayMode: 'standalone',
        },
        { text: 'fallback text' },
      );
      expect(declinedButCopied, 'canShare() === false should skip share() and use the clipboard').to.equal('copied');

      const unsupported = await shareOrCopy(
        { navigator: {}, window: {}, displayMode: 'standalone' },
        { url: 'https://example.com' },
      );
      expect(unsupported).to.equal('unsupported');
    },
  },
];
