# Web Push end to end

Web Push is the one PWA capability that looks like magic from the outside and is actually
four separate systems agreeing to cooperate: your app, the browser vendor's push service,
your server, and the service worker you already have running from [lesson 85](../85-service-workers-and-offline).
None of this is new architecture if you've shipped mobile push before — it's the same
"subscribe, hold a token, send through a broker" shape as APNs or FCM, with the browser
standing in for the OS.

## Who talks to whom

1. Your page calls `registration.pushManager.subscribe(...)`. The browser contacts *its own*
   push service — `fcm.googleapis.com` for Chrome, Mozilla's autopush for Firefox, Apple's
   for Safari — and gets back a `PushSubscription`.
2. A subscription is `{ endpoint, keys: { p256dh, auth } }`. The `endpoint` is a capability
   URL: whoever can POST to it can push a notification to that browser, so treat it like a
   bearer credential, not a public identifier. `p256dh` and `auth` are the keys your server
   uses to encrypt the payload so the push service itself can't read it (RFC 8291).
3. Your server stores that subscription and, whenever it wants to notify the user, POSTs an
   encrypted message to the endpoint. The push service delivers it to the browser, which
   wakes the service worker to handle a `push` event — even if no tab is open.

You never talk to the push service directly except through `pushManager`; you never talk to
the user's browser directly except through the push service. That indirection is the whole
point: it's how a page-not-open notification is even possible.

## VAPID: why the server signs

`subscribe({ userVisibleOnly: true, applicationServerKey })` — `userVisibleOnly: true` is
mandatory in every current browser; it's the browser's guarantee against silent tracking
pushes, and it means "every push you send me must result in a visible notification."
`applicationServerKey` is your VAPID public key (RFC 8292). VAPID lets a push service verify
which server is allowed to push to a given subscription and rate-limit or block abusive ones,
without the push service needing to know anything about your app's users. Your server signs
each push request with the matching private key. Generate the keypair once, keep the private
half server-side only, and never regenerate it casually — every existing subscription's
`applicationServerKey` binding breaks if you do.

Payload encryption (RFC 8291) and VAPID signing are fiddly enough that essentially nobody
hand-rolls them; the `web-push` npm package (or your framework's push helper) does both. The
part worth understanding conceptually — because it explains subscription lifecycle bugs — is
that the browser encrypts nothing for you client-side; it only *generates the keys* that let
your server encrypt correctly.

## The service worker side

```ts
// inside the service worker
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Update', {
      body: data.body,
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url === url);
      return existing ? existing.focus() : self.clients.openWindow(url);
    }),
  );
});
```

Both handlers must call `event.waitUntil` — the browser can suspend the worker the instant
the handler returns otherwise, same rule as the fetch/install handlers from lesson 85. A
subscription can also silently expire or rotate; listen for `pushsubscriptionchange` in the
service worker and re-subscribe there, or your server will keep POSTing to a dead endpoint.

## Safari and iOS are the asterisk

Push works on Safari for macOS 13+ and, on iOS/iPadOS, **only for a web app the user has
installed to the home screen** (iOS 16.4+) — a Safari tab open in the browser cannot receive
push at all on iOS. Apple also shipped **Declarative Web Push**, landing in iOS 18.4,
iPadOS 18.4, and macOS 15.5 (2025), where the payload itself is a static JSON notification
description rather than JavaScript run in a service worker — a fallback notification is
guaranteed even if any optional JS enhancement fails, eliminating the old "silent push"
penalty. WebKit proposed it to the W3C Push and Notifications API working groups starting
in 2023–2024; as of this writing there's no confirmed Chromium or Firefox adoption, so treat
it as an Apple-specific option layered on top of standard Web Push, not a cross-browser
replacement.

## Permission UX is the part that actually determines whether this works

`Notification.permission` is `'default'`, `'granted'`, or `'denied'` — and once a user denies,
most browsers give you exactly one shot: the *next* `requestPermission()` call resolves
`'denied'` immediately with no prompt at all, because the browser won't re-ask on your
behalf. That makes the request itself expensive to spend. The pattern that survives contact
with real users:

- **Never call `requestPermission()` on page load.** Chrome's "quiet UI" already
  auto-suppresses prompts it judges are triggered without user intent, and an unsolicited
  prompt on arrival is the single biggest cause of permanent denials.
- **Prime first.** Show your own UI explaining *why* — "get notified when your order
  ships" — with an explicit opt-in action. Only call the real `requestPermission()` after
  the user clicks something that says "enable notifications," so the browser's native prompt
  is a confirmation of stated intent, not a surprise.
- **Handle `denied` as a dead end, gracefully.** Don't hide the feature; show a static
  explanation of how to re-enable it from browser settings, since you cannot re-prompt.
- **Check `navigator.permissions.query({ name: 'notifications' })`** when you want to read
  current state without risking a prompt — `Notification.permission` is enough for most
  cases, but `permissions.query` also lets you listen for `change` if the user flips it from
  the browser's own UI.
- **Don't re-engage by nagging.** If the user dismissed your priming UI, don't show it again
  every session; a "maybe later" is a signal to back off, not a retry loop.

## Further reading (optional)

- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web.dev: Notifications permissions UX best practices](https://web.dev/articles/push-notifications-overview)
- [web-push npm package](https://github.com/web-push-libs/web-push)
- [WebKit: Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/)
