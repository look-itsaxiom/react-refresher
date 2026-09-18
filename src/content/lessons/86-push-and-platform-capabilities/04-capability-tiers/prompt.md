# Feature-detect the platform, don't guess at it

Real capability checks look like `'share' in navigator` and `'launchQueue' in window` — a key
either exists on the object or it doesn't, in every browser, installed or not. This exercise
practices that style of detection against an injected `platform` fake (since the real APIs
don't exist in this sandbox), plus the fallback chain every optional capability eventually
needs.

## `capabilityTiers`

```ts
type FakePlatform = {
  navigator: Record<string, unknown>;
  window: Record<string, unknown>;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
};

type Tiers = {
  tier: 'baseline' | 'installed' | 'enhanced';
  available: string[];
  missing: string[];
  hints: string[];
};

function capabilityTiers(platform: FakePlatform, manifest: Record<string, unknown>): Tiers;
```

Check exactly these five capabilities by key presence, nothing else:

| key | present when |
|---|---|
| `share` | `'share' in platform.navigator` |
| `setAppBadge` | `'setAppBadge' in platform.navigator` |
| `launchQueue` | `'launchQueue' in platform.window` |
| `PushManager` | `'PushManager' in platform.window` |
| `serviceWorker` | `'serviceWorker' in platform.navigator` |

`available` lists the keys present (in the order above); `missing` lists the rest, same
order. Assign `tier`:

- **`'baseline'`** whenever `platform.displayMode === 'browser'` (the app is running in an
  ordinary tab, not installed) — regardless of which APIs exist.
- Otherwise the app is installed. If `available.length >= 3`, the tier is **`'enhanced'`**;
  with fewer than 3 available capabilities, it's **`'installed'`**.

Then cross-check the manifest against what's actually available, and push a short string
onto `hints` for each mismatch that applies (any number, including zero):

- `manifest.share_target` is truthy, but `serviceWorker` is not available → hint that Share
  Target needs an active service worker.
- `manifest.file_handlers` is a non-empty array, but `launchQueue` is not available → hint
  that File Handling needs `launchQueue`.
- `manifest.display === 'standalone'`, but `platform.displayMode === 'browser'` → hint that
  the manifest expects standalone display but the app isn't installed.

## `shareOrCopy`

```ts
type ShareData = { title?: string; text?: string; url?: string };

function shareOrCopy(
  platform: FakePlatform,
  data: ShareData,
): Promise<'shared' | 'copied' | 'cancelled' | 'unsupported'>;
```

- If `platform.navigator.canShare` and `platform.navigator.share` both exist, and calling
  `canShare(data)` returns `true`, call `share(data)`. If it resolves, return `'shared'`. If
  it rejects with an error whose `name` is `'AbortError'` (the user backed out of the share
  sheet), return `'cancelled'` — don't let that rejection propagate.
- Otherwise, if `platform.navigator.clipboard?.writeText` exists, call it with `data.url ??
  data.text ?? ''` and return `'copied'`.
- Otherwise return `'unsupported'`.

The starter ships `makeFakePlatform(overrides)` so the preview has something to feature-detect
and share from.
