# Plan an auto-update

Both `electron-updater` and Tauri's updater plugin boil down to the same decision: given a
signed manifest describing a candidate release, should this particular install download it,
skip it, or be forced onto it? You're implementing that decision function directly — no
network, no real signing, just the logic a real updater runs after it already has the
manifest bytes in hand.

## `semverCompare(a, b)`

```ts
function semverCompare(a: string, b: string): number;
```

Compare two `major.minor.patch[-prerelease]` version strings per semver precedence rules,
returning a negative number if `a < b`, positive if `a > b`, `0` if equal:

- Compare `major`, then `minor`, then `patch` numerically.
- If the core versions are equal, a version **with** a prerelease tag is **lower** than the
  same version **without** one (`1.2.0-beta.1 < 1.2.0`).
- If both have prerelease tags, compare them identifier-by-identifier, splitting on `.`:
  a purely-numeric identifier compares numerically (`"2"` and `"10"` compare as `2 < 10`,
  not as strings); a numeric identifier is always lower than a non-numeric one; otherwise
  compare identifiers as strings. If one prerelease runs out of identifiers before the other
  and everything so far was equal, the shorter one is lower.

Build metadata (anything after a `+`) doesn't appear in this lesson's fixtures — you don't
need to handle it.

## `planUpdate(current, manifest, opts)`

```ts
type Manifest = {
  version: string;
  channel: string;
  rollout: number; // 0-100, percent of the install base
  minVersion?: string;
  signature: string;
  url: string;
};

type PlanOpts = {
  channel: string;
  deviceBucket: number; // this device's fixed bucket, 0-99
  verify: (manifestWithoutSignature: Omit<Manifest, 'signature'>, signature: string) => boolean;
};

function planUpdate(
  current: string,
  manifest: Manifest,
  opts: PlanOpts,
): { action: 'none' | 'download' | 'force'; reason: string };
```

Apply these rules **in this exact order** — the first one that matches decides the result:

1. Call `opts.verify(manifestWithoutSignature, manifest.signature)`, where
   `manifestWithoutSignature` is `manifest` minus its `signature` field. If it returns
   `false`, the result is `{ action: 'none', reason: 'bad-signature' }` — stop here, before
   looking at anything else in the manifest.
2. If `manifest.channel !== opts.channel`, the result is
   `{ action: 'none', reason: 'channel-mismatch' }`.
3. If `semverCompare(manifest.version, current) <= 0` (the manifest isn't actually newer),
   the result is `{ action: 'none', reason: 'not-newer' }`.
4. If `opts.deviceBucket >= manifest.rollout` (this device hasn't been reached by the staged
   rollout yet), the result is `{ action: 'none', reason: 'staged-rollout' }`.
5. If `manifest.minVersion` is set and `semverCompare(current, manifest.minVersion) < 0`
   (this install is below the floor the manifest requires), the result is
   `{ action: 'force', reason: 'below-minimum' }`.
6. Otherwise, `{ action: 'download', reason: 'update-available' }`.

Notice that the rollout gate (step 4) comes *before* the forced-update floor (step 5) — a
device outside the rollout percentage still waits, even if it's below `minVersion`. That's a
deliberate ordering choice real updaters make differently; this lesson picks one and asks you
to implement it exactly, not to redesign it.

## Ship something visible

The starter's default `App` renders the result of `planUpdate` for a couple of sample
manifests against a sample current version, so you can see `action`/`reason` pairs without
opening a console.
