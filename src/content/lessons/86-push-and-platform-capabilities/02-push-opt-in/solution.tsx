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

type Phase = 'checking' | 'blocked' | 'subscribed' | 'priming' | 'dismissed';

export function PushOptIn({ platform, appServerKey, onSubscribed }: PushOptInProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (platform.permission === 'denied') {
      setPhase('blocked');
      return;
    }
    let cancelled = false;
    platform.getSubscription().then((sub) => {
      if (cancelled) return;
      if (sub) {
        setSubscription(sub);
        setPhase('subscribed');
      } else {
        setPhase('priming');
      }
    });
    return () => {
      cancelled = true;
    };
    // Intentionally re-runs only when the platform instance changes.
  }, [platform]);

  async function handleEnable() {
    setBusy(true);
    try {
      const outcome = await platform.requestPermission();
      if (outcome === 'granted') {
        const sub = await platform.subscribe(appServerKey);
        await platform.sendToServer(sub);
        onSubscribed(sub);
        setSubscription(sub);
        setPhase('subscribed');
      } else if (outcome === 'denied') {
        setPhase('blocked');
      }
      // 'default': the user dismissed the native prompt. Stay on the priming card.
    } finally {
      setBusy(false);
    }
  }

  function handleMaybeLater() {
    setPhase('dismissed');
  }

  async function handleTurnOff() {
    if (!subscription) return;
    setBusy(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setPhase('priming');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'checking') {
    return <p>Checking notification status…</p>;
  }

  if (phase === 'blocked') {
    return (
      <div>
        <p>Notifications are blocked for this app.</p>
        <p>To turn them on, open your browser&rsquo;s site settings for this page and allow notifications.</p>
      </div>
    );
  }

  if (phase === 'subscribed') {
    return (
      <div>
        <p>Notifications on</p>
        <button type="button" onClick={handleTurnOff} disabled={busy}>
          Turn off
        </button>
      </div>
    );
  }

  if (phase === 'dismissed') {
    return <p>Maybe later — you can turn on notifications anytime.</p>;
  }

  return (
    <div>
      <p>Get notified when there&rsquo;s something new, right on this device.</p>
      <button type="button" onClick={handleEnable} disabled={busy}>
        Enable notifications
      </button>
      <button type="button" onClick={handleMaybeLater} disabled={busy}>
        Maybe later
      </button>
    </div>
  );
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
