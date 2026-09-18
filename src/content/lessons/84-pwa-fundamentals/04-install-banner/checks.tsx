import type { Check } from '../../../types';

type Outcome = 'accepted' | 'dismissed';
type FakeInstallPrompt = { prompt(): Promise<void>; userChoice: Promise<{ outcome: Outcome }> };
type DisplayMode = 'browser' | 'standalone' | 'minimal-ui' | 'window-controls-overlay';
type Storage = { get(key: string): unknown; set(key: string, value: unknown): void };
type InstallBannerProps = {
  displayMode: DisplayMode;
  promptEvent: FakeInstallPrompt | null;
  onOutcome: (outcome: Outcome) => void;
  isIOS?: boolean;
  storage: Storage;
};

function makeStorage(): Storage {
  const map = new Map<string, unknown>();
  return { get: (key) => map.get(key), set: (key, value) => map.set(key, value) };
}

export const checks: Check[] = [
  {
    name: 'renders nothing in any already-installed display mode, regardless of prompt or isIOS',
    run: async ({ mod, render, expect }) => {
      const InstallBanner = mod.InstallBanner as (props: InstallBannerProps) => import("react").ReactElement | null;
      const makeFakePrompt = mod.makeFakePrompt as (outcome: Outcome) => FakeInstallPrompt;
      for (const displayMode of ['standalone', 'minimal-ui', 'window-controls-overlay'] as const) {
        const { container } = render(
          <InstallBanner
            displayMode={displayMode}
            promptEvent={makeFakePrompt('accepted')}
            isIOS
            storage={makeStorage()}
            onOutcome={() => {}}
          />,
        );
        expect(container.textContent).to.equal('');
      }
    },
  },
  {
    name: 'browser mode with no prompt and isIOS shows a manual install fallback',
    run: async ({ mod, render, screen, expect }) => {
      const InstallBanner = mod.InstallBanner as (props: InstallBannerProps) => import("react").ReactElement | null;
      render(
        <InstallBanner displayMode="browser" promptEvent={null} isIOS storage={makeStorage()} onOutcome={() => {}} />,
      );
      expect(screen.getByText(/add to home screen/i)).to.be.ok;
    },
  },
  {
    name: 'browser mode with no prompt and not iOS renders nothing',
    run: async ({ mod, render, expect }) => {
      const InstallBanner = mod.InstallBanner as (props: InstallBannerProps) => import("react").ReactElement | null;
      const { container } = render(
        <InstallBanner displayMode="browser" promptEvent={null} storage={makeStorage()} onOutcome={() => {}} />,
      );
      expect(container.textContent).to.equal('');
    },
  },
  {
    name: 'a captured prompt renders an Install button; clicking it accepts, reports the outcome, and hides the banner',
    run: async ({ mod, render, screen, user, act, sleep, expect }) => {
      const InstallBanner = mod.InstallBanner as (props: InstallBannerProps) => import("react").ReactElement | null;
      const makeFakePrompt = mod.makeFakePrompt as (outcome: Outcome) => FakeInstallPrompt;
      let received: Outcome | null = null;
      render(
        <InstallBanner
          displayMode="browser"
          promptEvent={makeFakePrompt('accepted')}
          storage={makeStorage()}
          onOutcome={(outcome) => {
            received = outcome;
          }}
        />,
      );
      const button = screen.getByRole('button', { name: /install/i });
      await act(async () => {
        await user.click(button);
        await sleep(0);
      });
      expect(received).to.equal('accepted');
      expect(screen.queryByRole('button', { name: /install/i })).to.equal(null);
    },
  },
  {
    name: 'a dismissed outcome also hides the banner and records the dismissal in storage',
    run: async ({ mod, render, screen, user, act, sleep, expect }) => {
      const InstallBanner = mod.InstallBanner as (props: InstallBannerProps) => import("react").ReactElement | null;
      const makeFakePrompt = mod.makeFakePrompt as (outcome: Outcome) => FakeInstallPrompt;
      const storage = makeStorage();
      let received: Outcome | null = null;
      render(
        <InstallBanner
          displayMode="browser"
          promptEvent={makeFakePrompt('dismissed')}
          storage={storage}
          onOutcome={(outcome) => {
            received = outcome;
          }}
        />,
      );
      const button = screen.getByRole('button', { name: /install/i });
      await act(async () => {
        await user.click(button);
        await sleep(0);
      });
      expect(received).to.equal('dismissed');
      expect(screen.queryByRole('button', { name: /install/i })).to.equal(null);
      expect(storage.get('install-dismissed')).to.be.ok;
    },
  },
  {
    name: 're-rendering with storage that already recorded a dismissal renders nothing, even with a fresh prompt',
    run: async ({ mod, render, expect }) => {
      const InstallBanner = mod.InstallBanner as (props: InstallBannerProps) => import("react").ReactElement | null;
      const makeFakePrompt = mod.makeFakePrompt as (outcome: Outcome) => FakeInstallPrompt;
      const storage = makeStorage();
      storage.set('install-dismissed', true);
      const { container } = render(
        <InstallBanner
          displayMode="browser"
          promptEvent={makeFakePrompt('accepted')}
          storage={storage}
          onOutcome={() => {}}
        />,
      );
      expect(container.textContent).to.equal('');
    },
  },
];
