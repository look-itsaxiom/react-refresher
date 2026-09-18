import { useEffect, useState } from 'react';

export type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  unsubscribe(): Promise<boolean>;
};

export type Platform = {
  permission: 'default' | 'granted' | 'denied';
  requestPermission(): Promise<'granted' | 'denied' | 'default'>;
  subscribe(appServerKey: string): Promise<Subscription>;
  getSubscription(): Promise<Subscription | null>;
  sendToServer(sub: Subscription): Promise<void>;
};

/** Builds a working fake `Platform` for the live preview. Real browsers don't expose these APIs here. */
export function makeFakePlatform(overrides: Partial<Platform> = {}): Platform {
  let subscription: Subscription | null = null;
  return {
    permission: 'default',
    async requestPermission() {
      return 'granted';
    },
    async subscribe(appServerKey) {
      subscription = {
        endpoint: 'https://push.example.com/sub/demo',
        keys: { p256dh: 'demo-p256dh', auth: 'demo-auth' },
        async unsubscribe() {
          subscription = null;
          return true;
        },
      };
      void appServerKey;
      return subscription;
    },
    async getSubscription() {
      return subscription;
    },
    async sendToServer() {
      // pretend network call
    },
    ...overrides,
  };
}

type PushOptInProps = {
  platform: Platform;
  appServerKey: string;
  onSubscribed: (sub: Subscription) => void;
};

export function PushOptIn({ platform, appServerKey, onSubscribed }: PushOptInProps) {
  // TODO: implement the three states (blocked / subscribed / priming) and the
  // "Enable notifications" / "Maybe later" / "Turn off" flows described in the prompt.
  void platform;
  void appServerKey;
  void onSubscribed;
  return <p>TODO: build the opt-in flow</p>;
}

export default function App() {
  const [platform] = useState(() => makeFakePlatform());
  return (
    <PushOptIn
      platform={platform}
      appServerKey="demo-key"
      onSubscribed={(sub) => console.log('subscribed', sub)}
    />
  );
}
