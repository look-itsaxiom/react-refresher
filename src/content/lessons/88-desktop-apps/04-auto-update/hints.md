Split each version into its core (`major.minor.patch`) and an optional prerelease string
(everything after the first `-`). Compare the three numeric core parts first — if any differ,
you're done. Only fall through to prerelease comparison when the cores are equal.

---

For the "no prerelease vs. has a prerelease" rule, handle it as its own early return once the
cores are equal: no-prerelease-vs-no-prerelease is `0`; no-prerelease-vs-has-prerelease means
the no-prerelease one wins (it's "later"); both-have-prerelease is the only case that needs
identifier-by-identifier comparison.

---

For identifier comparison, test each identifier with something like `/^\d+$/` to decide
"is this purely numeric." Two numeric identifiers compare as numbers (`Number(a) - Number(b)`,
not string comparison — that's what makes `"2"` come before `"10"`). A numeric identifier
always loses to a non-numeric one regardless of content. Two non-numeric identifiers compare
as plain strings.

---

`planUpdate` is a straight sequence of six early returns, in the exact order given — resist
the temptation to reorder them for what "feels" more correct (like checking `minVersion`
before the rollout gate). The fixtures test the documented order specifically, including the
case where a device outside its rollout bucket gets `staged-rollout` even though it would
also qualify for a forced update.

---

Full shape:

```ts
function splitVersion(v) {
  const idx = v.indexOf('-');
  return idx === -1 ? [v, undefined] : [v.slice(0, idx), v.slice(idx + 1)];
}

function compareIdentifiers(a, b) {
  const aNum = /^\d+$/.test(a), bNum = /^\d+$/.test(b);
  if (aNum && bNum) return Number(a) - Number(b) < 0 ? -1 : Number(a) === Number(b) ? 0 : 1;
  if (aNum !== bNum) return aNum ? -1 : 1;
  return a === b ? 0 : a < b ? -1 : 1;
}

export function semverCompare(a, b) {
  const [aCore, aPre] = splitVersion(a);
  const [bCore, bPre] = splitVersion(b);
  const aParts = aCore.split('.').map(Number);
  const bParts = bCore.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  if (aPre === undefined && bPre === undefined) return 0;
  if (aPre === undefined) return 1;
  if (bPre === undefined) return -1;
  const aIds = aPre.split('.'), bIds = bPre.split('.');
  for (let i = 0; i < Math.max(aIds.length, bIds.length); i++) {
    if (i >= aIds.length) return -1;
    if (i >= bIds.length) return 1;
    const cmp = compareIdentifiers(aIds[i], bIds[i]);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

export function planUpdate(current, manifest, opts) {
  const { signature, ...rest } = manifest;
  if (!opts.verify(rest, signature)) return { action: 'none', reason: 'bad-signature' };
  if (manifest.channel !== opts.channel) return { action: 'none', reason: 'channel-mismatch' };
  if (semverCompare(manifest.version, current) <= 0) return { action: 'none', reason: 'not-newer' };
  if (opts.deviceBucket >= manifest.rollout) return { action: 'none', reason: 'staged-rollout' };
  if (manifest.minVersion && semverCompare(current, manifest.minVersion) < 0) {
    return { action: 'force', reason: 'below-minimum' };
  }
  return { action: 'download', reason: 'update-available' };
}
```
