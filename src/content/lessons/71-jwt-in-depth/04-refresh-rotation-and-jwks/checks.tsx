import type { Check } from '../../../types';

type RotateResult = { refreshToken: string; familyId: string } | { error: 'invalid' | 'reuse-detected' };

type Rotation = {
  issue(userId: string): { refreshToken: string; familyId: string };
  rotate(refreshToken: string): RotateResult;
  revokeFamily(familyId: string): void;
  isValid(refreshToken: string): boolean;
};

type Jwk = { kid: string; alg?: string; use?: string; [key: string]: unknown };
type Jwks = { keys: Jwk[] };

type Mod = {
  createRefreshRotation: (options: { clock: () => number; idFactory: () => string; ttlMs?: number }) => Rotation;
  jwksSelectKey: (jwks: Jwks, header: { kid?: string; alg: string }) => Jwk;
};

function fakeClock(startMs: number) {
  let t = startMs;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function idFactory(prefix: string) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export const checks: Check[] = [
  {
    name: 'issue returns a valid token in a fresh family',
    run: async ({ mod, expect }) => {
      const { createRefreshRotation } = mod as unknown as Mod;
      const clock = fakeClock(1_000_000);
      const rotation = createRefreshRotation({ clock: clock.now, idFactory: idFactory('t') });
      const { refreshToken, familyId } = rotation.issue('user-1');
      expect(refreshToken).to.be.a('string').and.not.equal('');
      expect(familyId).to.be.a('string').and.not.equal('');
      expect(rotation.isValid(refreshToken)).to.equal(true);
    },
  },
  {
    name: 'rotate exchanges a token for a new one in the same family, and the old token stops being valid',
    run: async ({ mod, expect }) => {
      const { createRefreshRotation } = mod as unknown as Mod;
      const clock = fakeClock(1_000_000);
      const rotation = createRefreshRotation({ clock: clock.now, idFactory: idFactory('t') });
      const { refreshToken: original, familyId } = rotation.issue('user-1');

      const result = rotation.rotate(original);
      if ('error' in result) throw new Error(`expected a successful rotation, got error: ${result.error}`);

      expect(result.familyId).to.equal(familyId);
      expect(result.refreshToken).to.not.equal(original);
      expect(rotation.isValid(original)).to.equal(false);
      expect(rotation.isValid(result.refreshToken)).to.equal(true);
    },
  },
  {
    name: 'rotate on an unknown token returns an invalid error',
    run: async ({ mod, expect }) => {
      const { createRefreshRotation } = mod as unknown as Mod;
      const clock = fakeClock(1_000_000);
      const rotation = createRefreshRotation({ clock: clock.now, idFactory: idFactory('t') });
      const result = rotation.rotate('never-issued-token');
      expect('error' in result && result.error).to.equal('invalid');
    },
  },
  {
    name: 'presenting an already-used token is detected as reuse and revokes the whole family',
    run: async ({ mod, expect }) => {
      const { createRefreshRotation } = mod as unknown as Mod;
      const clock = fakeClock(1_000_000);
      const rotation = createRefreshRotation({ clock: clock.now, idFactory: idFactory('t') });
      const { refreshToken: original } = rotation.issue('user-1');

      const first = rotation.rotate(original);
      if ('error' in first) throw new Error('expected first rotation to succeed');

      // Replaying the already-used original token is reuse.
      const replay = rotation.rotate(original);
      expect('error' in replay && replay.error).to.equal('reuse-detected');

      // The whole family -- including the token issued by the legitimate
      // first rotation -- is now revoked, not just the reused token.
      expect(rotation.isValid(first.refreshToken)).to.equal(false);
    },
  },
  {
    name: 'revokeFamily invalidates every token in that family',
    run: async ({ mod, expect }) => {
      const { createRefreshRotation } = mod as unknown as Mod;
      const clock = fakeClock(1_000_000);
      const rotation = createRefreshRotation({ clock: clock.now, idFactory: idFactory('t') });
      const { refreshToken, familyId } = rotation.issue('user-1');
      expect(rotation.isValid(refreshToken)).to.equal(true);

      rotation.revokeFamily(familyId);
      expect(rotation.isValid(refreshToken)).to.equal(false);

      const rotateAfterRevoke = rotation.rotate(refreshToken);
      expect('error' in rotateAfterRevoke).to.equal(true);
    },
  },
  {
    name: 'a token becomes invalid once the clock passes its ttl',
    run: async ({ mod, expect }) => {
      const { createRefreshRotation } = mod as unknown as Mod;
      const clock = fakeClock(1_000_000);
      const rotation = createRefreshRotation({ clock: clock.now, idFactory: idFactory('t'), ttlMs: 10_000 });
      const { refreshToken } = rotation.issue('user-1');

      clock.advance(5_000);
      expect(rotation.isValid(refreshToken)).to.equal(true);

      clock.advance(10_000);
      expect(rotation.isValid(refreshToken)).to.equal(false);
    },
  },
  {
    name: 'jwksSelectKey picks the key matching kid and alg',
    run: async ({ mod, expect }) => {
      const { jwksSelectKey } = mod as unknown as Mod;
      const jwks: Jwks = {
        keys: [
          { kid: 'key-1', alg: 'RS256', use: 'sig' },
          { kid: 'key-2', alg: 'RS256', use: 'sig' },
        ],
      };
      const key = jwksSelectKey(jwks, { kid: 'key-2', alg: 'RS256' });
      expect(key.kid).to.equal('key-2');
    },
  },
  {
    name: 'jwksSelectKey throws for an unrecognized kid instead of falling back to the first key',
    run: async ({ mod, expect }) => {
      const { jwksSelectKey } = mod as unknown as Mod;
      const jwks: Jwks = { keys: [{ kid: 'key-1', alg: 'RS256', use: 'sig' }] };
      expect(() => jwksSelectKey(jwks, { kid: 'not-in-the-set', alg: 'RS256' })).to.throw();
      expect(() => jwksSelectKey(jwks, { alg: 'RS256' })).to.throw();
    },
  },
  {
    name: 'jwksSelectKey throws when the matched key is for a different alg or is not a signing key',
    run: async ({ mod, expect }) => {
      const { jwksSelectKey } = mod as unknown as Mod;
      const jwks: Jwks = {
        keys: [
          { kid: 'key-1', alg: 'RS256', use: 'sig' },
          { kid: 'key-2', alg: 'RS256', use: 'enc' },
        ],
      };
      // A public RS256 key handed to something checking for HS256 must not
      // silently succeed -- this is the algorithm-confusion path.
      expect(() => jwksSelectKey(jwks, { kid: 'key-1', alg: 'HS256' })).to.throw();
      expect(() => jwksSelectKey(jwks, { kid: 'key-2', alg: 'RS256' })).to.throw();
    },
  },
];
