import type { Check } from '../../../types';

type Manifest = {
  version: string;
  channel: string;
  rollout: number;
  minVersion?: string;
  signature: string;
  url: string;
};

type PlanOpts = {
  channel: string;
  deviceBucket: number;
  verify: (manifestWithoutSignature: Omit<Manifest, 'signature'>, signature: string) => boolean;
};

type PlanResult = { action: 'none' | 'download' | 'force'; reason: string };

type Mod = {
  semverCompare: (a: string, b: string) => number;
  planUpdate: (current: string, manifest: Manifest, opts: PlanOpts) => PlanResult;
};

function baseManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: '2.4.0',
    channel: 'stable',
    rollout: 100,
    signature: 'sig',
    url: 'https://updates.example.com/2.4.0',
    ...overrides,
  };
}

const verifyAlways = () => true;
const verifyNever = () => false;

export const checks: Check[] = [
  {
    name: 'semverCompare orders major.minor.patch numerically and treats equal versions as 0',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { semverCompare } = mod as unknown as Mod;

      expect(semverCompare('1.2.0', '1.2.0')).to.equal(0);
      expect(semverCompare('1.3.0', '1.2.9')).to.be.greaterThan(0);
      expect(semverCompare('1.2.0', '1.10.0')).to.be.lessThan(0);
      expect(semverCompare('2.0.0', '1.9.9')).to.be.greaterThan(0);
    },
  },
  {
    name: 'a prerelease version is lower than the same core version without one, and numeric prerelease identifiers compare numerically',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { semverCompare } = mod as unknown as Mod;

      expect(semverCompare('1.2.0-beta.1', '1.2.0')).to.be.lessThan(0);
      expect(semverCompare('1.2.0', '1.2.0-beta.1')).to.be.greaterThan(0);
      // numeric identifier comparison, not string comparison ("10" is NOT less than "2" here)
      expect(semverCompare('1.2.0-alpha.2', '1.2.0-alpha.10')).to.be.lessThan(0);
      // a numeric identifier always ranks below a non-numeric one
      expect(semverCompare('1.2.0-alpha.9', '1.2.0-alpha.beta')).to.be.lessThan(0);
    },
  },
  {
    name: 'planUpdate rejects with bad-signature before looking at channel, version, or rollout',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planUpdate } = mod as unknown as Mod;

      const result = planUpdate('1.0.0', baseManifest({ channel: 'wrong-channel', rollout: 0 }), {
        channel: 'stable',
        deviceBucket: 50,
        verify: verifyNever,
      });

      expect(result).to.deep.equal({ action: 'none', reason: 'bad-signature' });
    },
  },
  {
    name: 'planUpdate reports channel-mismatch and not-newer distinctly once the signature verifies',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planUpdate } = mod as unknown as Mod;

      const mismatched = planUpdate('1.0.0', baseManifest({ channel: 'beta' }), {
        channel: 'stable',
        deviceBucket: 0,
        verify: verifyAlways,
      });
      expect(mismatched).to.deep.equal({ action: 'none', reason: 'channel-mismatch' });

      const notNewer = planUpdate('2.4.0', baseManifest({ version: '2.4.0' }), {
        channel: 'stable',
        deviceBucket: 0,
        verify: verifyAlways,
      });
      expect(notNewer).to.deep.equal({ action: 'none', reason: 'not-newer' });

      const older = planUpdate('2.5.0', baseManifest({ version: '2.4.0' }), {
        channel: 'stable',
        deviceBucket: 0,
        verify: verifyAlways,
      });
      expect(older).to.deep.equal({ action: 'none', reason: 'not-newer' });
    },
  },
  {
    name: 'planUpdate gates on the staged rollout, and offers a plain download once past every gate',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planUpdate } = mod as unknown as Mod;

      const gated = planUpdate('2.3.0', baseManifest({ rollout: 10 }), {
        channel: 'stable',
        deviceBucket: 50,
        verify: verifyAlways,
      });
      expect(gated).to.deep.equal({ action: 'none', reason: 'staged-rollout' });

      const reached = planUpdate('2.3.0', baseManifest({ rollout: 100 }), {
        channel: 'stable',
        deviceBucket: 99,
        verify: verifyAlways,
      });
      expect(reached).to.deep.equal({ action: 'download', reason: 'update-available' });
    },
  },
  {
    name: 'planUpdate forces an update below minVersion, but only once the device is inside the rollout',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planUpdate } = mod as unknown as Mod;

      const forced = planUpdate('1.0.0', baseManifest({ version: '2.0.0', rollout: 100, minVersion: '1.5.0' }), {
        channel: 'stable',
        deviceBucket: 0,
        verify: verifyAlways,
      });
      expect(forced).to.deep.equal({ action: 'force', reason: 'below-minimum' });

      // same install, but this device's bucket falls outside the rollout: staged-rollout wins,
      // even though it would otherwise qualify for a forced update
      const stillGated = planUpdate('1.0.0', baseManifest({ version: '2.0.0', rollout: 10, minVersion: '1.5.0' }), {
        channel: 'stable',
        deviceBucket: 50,
        verify: verifyAlways,
      });
      expect(stillGated).to.deep.equal({ action: 'none', reason: 'staged-rollout' });
    },
  },
  {
    name: 'planUpdate passes the manifest minus its signature, and the actual signature, to verify',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planUpdate } = mod as unknown as Mod;

      let seenManifest: unknown;
      let seenSignature: unknown;
      const manifest = baseManifest({ signature: 'the-real-signature' });

      planUpdate('1.0.0', manifest, {
        channel: 'stable',
        deviceBucket: 0,
        verify: (m, sig) => {
          seenManifest = m;
          seenSignature = sig;
          return true;
        },
      });

      expect(seenSignature).to.equal('the-real-signature');
      expect(seenManifest).to.not.have.property('signature');
      expect((seenManifest as { version: string }).version).to.equal(manifest.version);
    },
  },
];
