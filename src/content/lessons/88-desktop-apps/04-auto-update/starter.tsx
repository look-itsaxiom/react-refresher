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

// TODO: compare a.major/minor/patch numerically, then prerelease identifiers per semver
// precedence rules (numeric identifiers compare numerically; a version with no prerelease
// outranks the same core version with one).
export function semverCompare(_a: string, _b: string): number {
  return 0;
}

// TODO: apply the six rules from the prompt, in order, and return the first one that matches.
export function planUpdate(_current: string, _manifest: Manifest, _opts: PlanOpts): PlanResult {
  return { action: 'none', reason: 'not-newer' };
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
