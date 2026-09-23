# The rest of the platform

Push is the headline feature, but the "installed app" surface has grown a whole family of
smaller APIs since PWAs went mainstream. Chromium's team calls this collection **Project
Fugu**; most of it never reaches Safari or Firefox, so the real skill isn't memorizing every
API — it's structuring your app so each one is an enhancement, never a dependency.

## Badging

`navigator.setAppBadge(count)` puts a number (or an unadorned dot with no argument) on the
installed app's icon; `clearAppBadge()` removes it. It only does anything for an app the user
has installed — calling it in a browser tab is a harmless no-op in every implementation, which
is exactly the shape you want from a progressive enhancement. Support is not Baseline; Safari
and Firefox coverage varies, so feature-detect with `'setAppBadge' in navigator` and don't
block anything on it.

## Web Share and Share Target

`navigator.share({ title, text, url })` opens the OS's native share sheet — but only inside a
user gesture (a click handler), never on load or in a `useEffect`. Check `navigator.canShare(data)`
first; it validates the data shape (e.g., whether the browser can share `files`) without
triggering any UI. Both throw or reject; a user backing out of the share sheet rejects with an
`AbortError`, which is a cancellation, not a failure — don't show an error toast for it.

Share Target is the inverse: your manifest declares `share_target` so your *installed* PWA
appears as a destination in *other apps'* share sheets.

```json
{
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": { "title": "title", "text": "text", "url": "url" }
  }
}
```

A `POST` variant with `"enctype": "multipart/form-data"` and a `files` param lets other apps
share files (images, PDFs) into yours. Share Target only activates once the app is installed
and has a service worker registered to handle the navigation — a common integration bug is
declaring it in the manifest and never checking that the SW is actually active.

## File Handling and Launch Handler

`file_handlers` in the manifest registers your installed PWA as an OS-level handler for file
types (double-click a `.md` file, your app opens). The app reads the launch through
`window.launchQueue.setConsumer((params) => { ... params.files })` — a queue, not an event,
because the launch can happen before your consumer is registered and you don't want to miss
it. `launchQueue` only exists when `file_handlers` support is present (Chromium desktop,
mainly), so this is another "declare it, then check for the API before touching it" pair.
**Launch Handler** (`launch_handler` in the manifest) is a separate, smaller knob: it controls
whether a second launch of an already-open PWA reuses the existing window or opens a new one.

## Protocol Handlers and the Fugu grab-bag

`protocol_handlers` registers your app for a custom scheme (`web+myapp://...`), similar to
how a desktop mail client registers for `mailto:`. Beyond that sits the rest of Fugu: **Web
Bluetooth**, **Web USB**, **Web Serial**, **Web HID**, **Web NFC** — all Chromium/Edge-only,
all aimed at PWAs replacing native apps for hardware integration, and all explicitly rejected
by Apple's and Mozilla's security teams as too large an attack surface for the web platform.
Don't design a product around them unless Chromium-only is an acceptable constraint (kiosk
hardware, internal tools). The **File System Access API** (direct read/write to the user's
real filesystem, Chromium-only) is the one exception with a cross-browser fallback already in
your toolkit — OPFS, covered in [lesson 30](../30-web-apis-storage-observers/01-where-data-lives.md),
works everywhere and covers most of the same use cases without the platform lock-in.

A few more worth knowing by name: **Screen Wake Lock** (`navigator.wakeLock.request('screen')`,
keeps the display on — recipe apps, presentations), **Contact Picker**
(`navigator.contacts.select(...)`, Chromium-only, user-initiated), **Local Font Access**
(enumerate the user's installed fonts — mostly a design-tool niche), and **Window Controls
Overlay** (lets an installed desktop PWA draw its own content into the title-bar area instead
of leaving it blank chrome).

## Permissions Policy

Beyond per-API permission prompts, **Permissions Policy** (the header/attribute successor to
Feature Policy) controls which capabilities are allowed to be *invoked at all* in a given
context — notably relevant for third-party iframes, which can be blocked from ever calling
`geolocation` or `camera` regardless of what the top-level page allows. If you embed
untrusted content, or are embedded, this is the layer that decides what's even reachable
before a permission prompt could occur.

## Structuring a React app around optional capabilities

The pattern that keeps this from turning into `if` statements scattered across your component
tree is a small `usePlatformCapability` hook that centralizes the feature-detection:

```tsx
function usePlatformCapability(check: () => boolean) {
  return useMemo(check, []);
}

function ShareButton({ data }: { data: ShareData }) {
  const canShare = usePlatformCapability(() => 'share' in navigator);
  if (!canShare) return <CopyLinkButton data={data} />;
  return <button onClick={() => navigator.share(data)}>Share</button>;
}
```

The hook itself is almost too simple to bother naming — the value is the *discipline* it
enforces: every optional capability gets exactly one detection point, a real fallback
component (not a hidden button), and never a global "is this a supported browser" flag that
tries to predict every API at once. Detect per-capability, at the point of use, and always
render *something* on the unsupported path.

## Further reading (optional)

- [MDN: Badging API](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API)
- [MDN: Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [web.dev: File Handling API](https://web.dev/articles/file-handling)
- [Chrome Fugu API tracker](https://fugu-tracker.web.app/)
