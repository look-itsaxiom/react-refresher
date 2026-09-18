export type Manifest = {
  version: string;
  channel: string;
  rollout: number;
  minVersion?: string;
  signature: string;
  url: string;
};

export type PlanOpts = {
  channel: string;
  deviceBucket: number;
  verify: (manifestWithoutSignature: Omit<Manifest, 'signature'>, signature: string) => boolean;
};

export type PlanResult = { action: 'none' | 'download' | 'force'; reason: string };

function splitVersion(v: string): [string, string | undefined] {
  const idx = v.indexOf('-');
  if (idx === -1) return [v, undefined];
  return [v.slice(0, idx), v.slice(idx + 1)];
}

function compareIdentifiers(a: string, b: string): number {
  const aIsNumeric = /^\d+$/.test(a);
  const bIsNumeric = /^\d+$/.test(b);

  if (aIsNumeric && bIsNumeric) {
    const diff = Number(a) - Number(b);
    return diff === 0 ? 0 : diff < 0 ? -1 : 1;
  }
  if (aIsNumeric !== bIsNumeric) {
    // numeric identifiers always have lower precedence than non-numeric ones
    return aIsNumeric ? -1 : 1;
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function semverCompare(a: string, b: string): number {
  const [aCore, aPre] = splitVersion(a);
  const [bCore, bPre] = splitVersion(b);

  const aParts = aCore.split('.').map(Number);
  const bParts = bCore.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }

  if (aPre === undefined && bPre === undefined) return 0;
  if (aPre === undefined) return 1; // no prerelease outranks a prerelease of the same core version
  if (bPre === undefined) return -1;

  const aIds = aPre.split('.');
  const bIds = bPre.split('.');
  const len = Math.max(aIds.length, bIds.length);
  for (let i = 0; i < len; i++) {
    if (i >= aIds.length) return -1; // ran out of identifiers first -> lower precedence
    if (i >= bIds.length) return 1;
    const cmp = compareIdentifiers(aIds[i]!, bIds[i]!);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

export function planUpdate(current: string, manifest: Manifest, opts: PlanOpts): PlanResult {
  const { signature, ...manifestWithoutSignature } = manifest;

  if (!opts.verify(manifestWithoutSignature, signature)) {
    return { action: 'none', reason: 'bad-signature' };
  }
  if (manifest.channel !== opts.channel) {
    return { action: 'none', reason: 'channel-mismatch' };
  }
  if (semverCompare(manifest.version, current) <= 0) {
    return { action: 'none', reason: 'not-newer' };
  }
  if (opts.deviceBucket >= manifest.rollout) {
    return { action: 'none', reason: 'staged-rollout' };
  }
  if (manifest.minVersion && semverCompare(current, manifest.minVersion) < 0) {
    return { action: 'force', reason: 'below-minimum' };
  }
  return { action: 'download', reason: 'update-available' };
}

const sampleManifest: Manifest = {
  version: '2.4.0',
  channel: 'stable',
  rollout: 100,
  signature: 'sig',
  url: 'https://updates.example.com/2.4.0',
};

const verifyAlways = () => true;

export default function App() {
  const plan = planUpdate('2.3.0', sampleManifest, {
    channel: 'stable',
    deviceBucket: 5,
    verify: verifyAlways,
  });

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>Auto-update planner demo</h3>
      <p data-testid="plan">
        {plan.action} ({plan.reason})
      </p>
      <p data-testid="compare">semverCompare(2.4.0, 2.3.0) = {semverCompare('2.4.0', '2.3.0')}</p>
    </div>
  );
}
