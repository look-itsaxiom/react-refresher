# Build a `<PushOptIn>` component

Real browsers give you exactly one shot at the notification permission prompt before a
denial locks you out, so this component practices the priming pattern from the concept step:
explain first, only trigger the real (here, fake) permission prompt on explicit opt-in, and
handle every outcome without crashing or double-subscribing.

You're given a `platform` object — a stand-in for the real browser APIs, which don't exist in
this sandbox:

```ts
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
```

`<PushOptIn platform={platform} appServerKey={appServerKey} onSubscribed={onSubscribed} />`
must behave like this:

1. **Already blocked.** If `platform.permission === 'denied'` when the component mounts,
   render a short static explanation of how to re-enable notifications from browser settings.
   Do not render any button — there is nothing left to prompt for.
2. **Already subscribed.** Otherwise, on mount, call `platform.getSubscription()`. If it
   resolves to an existing subscription, show a "Notifications on" state with a "Turn off"
   button. Clicking it calls that subscription's own `unsubscribe()` method.
3. **Priming.** Otherwise, show a priming card explaining the value, with two actions:
   - **"Enable notifications"** — calls `platform.requestPermission()` first. Only if that
     resolves `'granted'` do you call `platform.subscribe(appServerKey)`, then
     `platform.sendToServer(sub)`, then the `onSubscribed(sub)` prop, then switch to the
     "Notifications on" state. If the outcome is `'denied'`, switch to the blocked
     explanation from step 1. Never call `subscribe` or `sendToServer` on any other outcome.
   - **"Maybe later"** — dismisses the priming card without calling any platform method at
     all, not even `requestPermission`.
4. **In flight.** While "Enable notifications" is awaiting its chain of promises, that button
   (and ideally the whole card's controls) should be disabled so a second click can't fire a
   second subscription.

The starter includes `makeFakePlatform(overrides)`, a small helper that builds a working fake
`platform` for the live preview, since `Notification`, `PushManager`, and friends don't exist
in this sandbox or in the real browser you'd otherwise test this in headlessly.
