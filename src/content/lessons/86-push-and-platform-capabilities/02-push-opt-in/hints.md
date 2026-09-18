Start from the three mutually-exclusive views, not from the events. Give the component a
single state variable like `phase: 'checking' | 'blocked' | 'subscribed' | 'priming' | 'dismissed'`
and let one `useEffect` on mount decide the first real phase (`'blocked'` if
`platform.permission === 'denied'`, otherwise await `getSubscription()` to choose between
`'subscribed'` and `'priming'`).

---

Track "in flight" with its own boolean state (e.g. `busy`), separate from `phase`. Set it
`true` right before the `requestPermission → subscribe → sendToServer → onSubscribed` chain
starts, and `false` in a `finally` block so it clears whether the chain succeeds, gets denied,
or throws.

---

The click handler for "Enable notifications" is a straight-line async function — resist the
urge to branch into separate handlers per outcome. Something like:

```tsx
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
    // 'default' (dismissed the native prompt): stay on the priming card.
  } finally {
    setBusy(false);
  }
}
```

---

"Maybe later" is the simplest handler in the component — it only ever calls `setPhase('dismissed')`.
If you find yourself calling any `platform` method from it, that's the bug the checks are
looking for.

---

For "Turn off," call `subscription.unsubscribe()` (the method on the object `getSubscription()`
or `subscribe()` gave you), not some method on `platform` — the real `PushSubscription` API
puts `unsubscribe()` on the subscription itself, and this fake mirrors that on purpose.
