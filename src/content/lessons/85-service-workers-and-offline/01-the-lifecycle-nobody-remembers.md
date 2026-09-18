# The lifecycle nobody remembers

You've almost certainly used an app with a service worker (every PWA, most
Vite/CRA-generated apps that ticked the "PWA" box, Gmail, Twitter/X). You've
probably never debugged one until it broke. Then you meet the state machine.

## Registration and scope

```ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
}
```

The `scope` defaults to the directory the script lives in. A worker at
`/sw.js` can control `/` and everything under it; a worker at `/app/sw.js`
can only control `/app/*` unless the server sends a
`Service-Worker-Allowed: /` response header on the script itself, widening
the scope beyond its own path. This is the #1 "why doesn't my SW intercept
this request" bug in monorepos and subpath deployments: the script is
served from a folder that scopes it too narrowly.

A registered worker doesn't control the page that registered it — not yet.
The tab that ran `register()` keeps loading from the network like nothing
happened. Only a **future navigation** (reload, or a new tab) gets
controlled, once the worker is `activated`. This surprises people who expect
the SW to intercept the very fetches on the page that installed it.

## The state machine

Every service worker moves through a fixed set of states, and React 18
habits don't help here — this is closer to a finite-state machine than a
component lifecycle:

```
installing → installed (waiting) → activating → activated → redundant
```

- **`installing`**: the browser downloaded the script (or found it changed —
  see updates below) and is running the `install` event. Wrap setup work in
  `event.waitUntil(promise)`; the state doesn't advance to `installed` until
  that promise resolves. This is where precaching happens.
- **`installed` / waiting**: if there's already an active worker controlling
  open tabs, the new one parks here. It does **not** take over automatically
  — this is deliberate. Two versions of your app's JS running in the same
  tab (old controller, new cached assets) would corrupt state silently, so
  the browser refuses to activate a new worker while any tab it would
  control is still open.
- **`activating`**: runs the `activate` event, `waitUntil`-wrapped, typically
  cache cleanup (deleting old cache names).
- **`activated`**: controls new navigations and, if `clients.claim()` was
  called during `activate`, controls *already-open* tabs too.
- **`redundant`**: replaced by a newer worker, or install/activation failed.
  A `redundant` worker never runs again.

The events: `install` and `activate` fire on the worker's own scope and are
wrapped in `event.waitUntil()` so the browser knows when the phase is done.
Network requests reach `fetch`, wrapped in `event.respondWith(promise)` —
this is the actual interception point. `message` fires when a page calls
`worker.postMessage(...)`; it's the one channel a page has to talk *to* a
worker it doesn't control yet, which matters for the update UX below.

## Why a new worker waits, and the hazards of forcing it

`self.skipWaiting()`, called during `install`, skips the "wait for old tabs
to close" step and activates immediately — even with old tabs still open.
`self.clients.claim()`, called during `activate`, makes the *now-active*
worker start controlling those same open tabs immediately, instead of
waiting for their next reload.

Used together (a common default, including Vite PWA's `autoUpdate` mode),
they turn the safe-by-default lifecycle into an unsafe-by-default one: a tab
that's been open for an hour can suddenly have its `fetch` calls intercepted
by a worker running different code than what the page's own JS expects,
mid-session. If that new worker's `fetch` handler returns different response
shapes, or your app checks `caches` directly, or you rely on both versions
agreeing on a cache name, this breaks in ways that only show up as "it works
after I close and reopen the tab."

The safe pattern: let the new worker wait, and surface a "New version
available" prompt with an "Update" button. Only call `skipWaiting()` in
response to that explicit action.

## Detecting updates, and the stale-`index.html` outage

The browser re-fetches your registered script (byte for byte) on every
navigation to an in-scope page, and at least every 24 hours regardless of
navigations, **ignoring** any `Cache-Control` header on it up to that 24-hour
ceiling — this is a deliberate carve-out (`updateViaCache: 'none'` is also
the default for the *imports* a classic-script SW pulls in via
`importScripts`, though modern tooling mostly ships one bundled file). If
the bytes differ at all, even by a comment, the browser installs the new
version and fires `updatefound` on the registration.

This is exactly why you must **never** let `sw.js` itself sit behind a long
`Cache-Control: max-age`. A CDN or misconfigured static host that caches
`sw.js` for a year means the browser's update check can be defeated by an
intermediate cache before it ever reaches your server — this has caused
real production outages: a broken deploy ships, someone fixes it, but every
returning visitor keeps re-registering the *cached, broken* worker for a
year. `sw.js` should be `Cache-Control: no-cache` (or `max-age=0`), always.

The mirror-image bug is the one people actually blame the service worker
for: precaching `index.html` (or any unrevisioned asset) at an old URL,
serving it forever, and having it reference JS/CSS bundle hashes from three
deploys ago that 404 because that build's `dist/` no longer exists. The fix,
covered in the next step, is that precache entries are keyed by
**revision**: a hashed filename (`main.a1b2c3d4.js`) is treated as
self-revisioned, and an unhashed file like `index.html` needs an explicit
revision (a content hash Workbox or `vite-plugin-pwa` computes at build
time) so the precache manifest — not the browser HTTP cache — decides when
to refetch it.

## Update UX: prompt, auto, or silent-next-visit

Three real patterns, not one "correct" answer:

- **Prompt-to-update** (`vite-plugin-pwa`'s `registerType: 'prompt'`): the
  new worker parks in `waiting`; you show a toast; on click, the page does
  `registration.waiting.postMessage({ type: 'SKIP_WAITING' })`; the waiting
  worker's own `message` handler calls `self.skipWaiting()`; the page
  listens for `navigator.serviceWorker.oncontrollerchange` and reloads once
  it fires. This is the only pattern with zero risk of the mid-session
  double-version hazard above, at the cost of a visible prompt.
- **Auto-update** (`registerType: 'autoUpdate'`): the plugin calls
  `skipWaiting()` and `clients.claim()` for you, no prompt. Simplest to
  ship, but inherits every hazard described above — fine for apps with no
  meaningful client-side state that would break if two versions collide.
- **Reload on next navigation**: don't force anything; let the waiting
  worker activate naturally the next time the user closes every tab and
  comes back. Least surprising, slowest rollout.

## Further reading

- [MDN: Service worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Service_worker_lifecycle)
- [web.dev: The service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)
- [web.dev: An easier way to reload your web app (SKIP_WAITING pattern)](https://web.dev/articles/service-worker-lifecycle)
- [vite-plugin-pwa: registerType docs](https://vite-pwa-org.netlify.app/guide/auto-update.html)
