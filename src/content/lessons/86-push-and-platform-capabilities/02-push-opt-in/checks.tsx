import type { Check } from '../../../types';
import type { ComponentType } from 'react';

type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  unsubscribe(): Promise<boolean>;
};

type Platform = {
  permission: 'default' | 'granted' | 'denied';
  requestPermission(): Promise<'granted' | 'denied' | 'default'>;
  subscribe(appServerKey: string): Promise<Subscription>;
  getSubscription(): Promise<Subscription | null>;
  sendToServer(sub: Subscription): Promise<void>;
};

type PushOptInProps = {
  platform: Platform;
  appServerKey: string;
  onSubscribed: (sub: Subscription) => void;
};

function makeSubscription(calls: string[]): Subscription {
  return {
    endpoint: 'https://push.example.com/sub/test',
    keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    async unsubscribe() {
      calls.push('unsubscribe');
      return true;
    },
  };
}

function makeRecordingPlatform(
  opts: {
    permission?: 'default' | 'granted' | 'denied';
    requestOutcome?: 'granted' | 'denied' | 'default';
    existingSubscription?: Subscription | null;
  } = {},
): { platform: Platform; calls: string[] } {
  const calls: string[] = [];
  const platform: Platform = {
    permission: opts.permission ?? 'default',
    async requestPermission() {
      calls.push('requestPermission');
      return opts.requestOutcome ?? 'granted';
    },
    async subscribe(appServerKey) {
      calls.push('subscribe');
      void appServerKey;
      return makeSubscription(calls);
    },
    async getSubscription() {
      calls.push('getSubscription');
      return opts.existingSubscription ?? null;
    },
    async sendToServer() {
      calls.push('sendToServer');
    },
  };
  return { platform, calls };
}

export const checks: Check[] = [
  {
    name: 'calls requestPermission, then subscribe, then sendToServer, in that order, and reports the new subscription',
    run: async (ctx) => {
      const { render, within, user, act, expect, mod } = ctx;
      const { PushOptIn } = mod as { PushOptIn: ComponentType<PushOptInProps> };
      const { platform, calls } = makeRecordingPlatform({ requestOutcome: 'granted' });
      let reported: Subscription | null = null;

      const view = render(
        <PushOptIn
          platform={platform}
          appServerKey="app-key"
          onSubscribed={(sub) => {
            reported = sub;
          }}
        />,
      );
      const scoped = within(view.container);

      const enableButton = await scoped.findByRole('button', { name: /enable notifications/i });
      await act(async () => {
        await user.click(enableButton);
      });

      expect(calls, 'call order').to.include('requestPermission');
      expect(calls, 'call order').to.include('subscribe');
      expect(calls, 'call order').to.include('sendToServer');
      expect(calls.indexOf('requestPermission'), 'requestPermission before subscribe').to.be.lessThan(
        calls.indexOf('subscribe'),
      );
      expect(calls.indexOf('subscribe'), 'subscribe before sendToServer').to.be.lessThan(
        calls.indexOf('sendToServer'),
      );
      expect(reported, 'onSubscribed should receive the subscription').to.not.equal(null);
      expect((reported as unknown as Subscription).endpoint).to.equal('https://push.example.com/sub/test');
    },
  },
  {
    name: 'when the permission prompt resolves denied, never calls subscribe or sendToServer',
    run: async (ctx) => {
      const { render, within, user, act, expect, mod } = ctx;
      const { PushOptIn } = mod as { PushOptIn: ComponentType<PushOptInProps> };
      const { platform, calls } = makeRecordingPlatform({ requestOutcome: 'denied' });

      const view = render(<PushOptIn platform={platform} appServerKey="app-key" onSubscribed={() => {}} />);
      const scoped = within(view.container);

      const enableButton = await scoped.findByRole('button', { name: /enable notifications/i });
      await act(async () => {
        await user.click(enableButton);
      });

      expect(calls).to.include('requestPermission');
      expect(calls, 'subscribe must not run after a denial').to.not.include('subscribe');
      expect(calls, 'sendToServer must not run after a denial').to.not.include('sendToServer');
    },
  },
  {
    name: 'permission already denied at mount renders a static explanation with no button',
    run: async (ctx) => {
      const { render, within, expect, mod } = ctx;
      const { PushOptIn } = mod as { PushOptIn: ComponentType<PushOptInProps> };
      const { platform } = makeRecordingPlatform({ permission: 'denied' });

      const view = render(<PushOptIn platform={platform} appServerKey="app-key" onSubscribed={() => {}} />);
      const scoped = within(view.container);

      expect(await scoped.findByText(/blocked/i)).to.exist;
      expect(scoped.queryByRole('button'), 'no button once permission is denied').to.equal(null);
    },
  },
  {
    name: 'an existing subscription on mount skips the prompt and offers to turn notifications off',
    run: async (ctx) => {
      const { render, within, user, act, expect, mod } = ctx;
      const { PushOptIn } = mod as { PushOptIn: ComponentType<PushOptInProps> };
      const calls: string[] = [];
      const existing = makeSubscription(calls);
      const { platform } = makeRecordingPlatform({ existingSubscription: existing });

      const view = render(<PushOptIn platform={platform} appServerKey="app-key" onSubscribed={() => {}} />);
      const scoped = within(view.container);

      expect(await scoped.findByText(/notifications on/i)).to.exist;
      expect(scoped.queryByRole('button', { name: /enable notifications/i }), 'no priming prompt').to.equal(null);
      expect(calls, 'requestPermission should never be called when already subscribed').to.not.include(
        'requestPermission',
      );

      const turnOff = scoped.getByRole('button', { name: /turn off/i });
      await act(async () => {
        await user.click(turnOff);
      });
      expect(calls).to.include('unsubscribe');
    },
  },
  {
    name: '"Maybe later" dismisses the priming card without calling requestPermission, subscribe, or sendToServer',
    run: async (ctx) => {
      const { render, within, user, act, expect, mod } = ctx;
      const { PushOptIn } = mod as { PushOptIn: ComponentType<PushOptInProps> };
      const { platform, calls } = makeRecordingPlatform();

      const view = render(<PushOptIn platform={platform} appServerKey="app-key" onSubscribed={() => {}} />);
      const scoped = within(view.container);
      const laterButton = await scoped.findByRole('button', { name: /maybe later/i });

      // Mounting is allowed to check for an existing subscription; only the click itself is under test here.
      calls.length = 0;

      await act(async () => {
        await user.click(laterButton);
      });

      expect(calls, 'dismissing must not call requestPermission, subscribe, or sendToServer').to.deep.equal([]);
      expect(scoped.queryByRole('button', { name: /enable notifications/i })).to.equal(null);
    },
  },
  {
    name: 'the enable button is disabled while the subscription chain is in flight',
    run: async (ctx) => {
      const { render, within, user, act, expect, mod } = ctx;
      const { PushOptIn } = mod as { PushOptIn: ComponentType<PushOptInProps> };

      let resolveRequest: ((value: 'granted') => void) | undefined;
      const platform: Platform = {
        permission: 'default',
        async getSubscription() {
          return null;
        },
        requestPermission: () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }),
        async subscribe() {
          return makeSubscription([]);
        },
        async sendToServer() {},
      };

      const view = render(<PushOptIn platform={platform} appServerKey="app-key" onSubscribed={() => {}} />);
      const scoped = within(view.container);

      const enableButton = await scoped.findByRole('button', { name: /enable notifications/i });
      await act(async () => {
        await user.click(enableButton);
      });

      expect(scoped.getByRole('button', { name: /enable notifications/i })).to.have.property('disabled', true);

      await act(async () => {
        resolveRequest?.('granted');
      });
    },
  },
];
