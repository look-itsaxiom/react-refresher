import type { Check } from '../../../types';

type Claims = {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  nonce?: string;
  [key: string]: unknown;
};

type Options = {
  issuer: string;
  clientId: string;
  nonce: string;
  now: number;
  maxAgeSeconds?: number;
  leewaySeconds?: number;
};

type Mod = {
  validateIdToken: (claims: Claims, options: Options) => { ok: boolean; errors: string[] };
  redirectUriAllowed: (registered: string, actual: string) => boolean;
};

const ISS = 'https://auth.example.com';
const CLIENT_ID = 'client-abc';
const NOW = 1_800_000_000;

const baseClaims = (): Claims => ({
  iss: ISS,
  aud: CLIENT_ID,
  sub: 'user-1',
  exp: NOW + 300,
  iat: NOW - 10,
  nonce: 'nonce-1',
});

const baseOptions = (): Options => ({
  issuer: ISS,
  clientId: CLIENT_ID,
  nonce: 'nonce-1',
  now: NOW,
});

export const checks: Check[] = [
  {
    name: 'validateIdToken accepts a well-formed, matching token (single-string aud, no azp)',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const result = validateIdToken(baseClaims(), baseOptions());
      expect(result.ok).to.equal(true);
      expect(result.errors).to.have.length(0);
    },
  },
  {
    name: 'validateIdToken rejects a mismatched issuer and a nonce that does not match',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const wrongIssuer = validateIdToken({ ...baseClaims(), iss: 'https://attacker.example.com' }, baseOptions());
      expect(wrongIssuer.ok).to.equal(false);

      const wrongNonce = validateIdToken({ ...baseClaims(), nonce: 'replayed-nonce' }, baseOptions());
      expect(wrongNonce.ok).to.equal(false);
    },
  },
  {
    name: 'validateIdToken rejects an expired token, applying leeway correctly',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const claims = { ...baseClaims(), exp: NOW - 50 };
      const stillExpired = validateIdToken(claims, { ...baseOptions(), leewaySeconds: 30 });
      expect(stillExpired.ok).to.equal(false);
      const withinLeeway = validateIdToken(claims, { ...baseOptions(), leewaySeconds: 60 });
      expect(withinLeeway.ok).to.equal(true);
    },
  },
  {
    name: 'validateIdToken requires azp when aud is a multi-entry array, even naming Google/Entra-style setups',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const noAzp = validateIdToken(
        { ...baseClaims(), aud: [CLIENT_ID, 'https://other-audience.example.com'] },
        baseOptions(),
      );
      expect(noAzp.ok).to.equal(false);
      expect(noAzp.errors.some((e) => e.toLowerCase().includes('azp'))).to.equal(true);

      const wrongAzp = validateIdToken(
        { ...baseClaims(), aud: [CLIENT_ID, 'https://other-audience.example.com'], azp: 'some-other-client' },
        baseOptions(),
      );
      expect(wrongAzp.ok).to.equal(false);

      const correctAzp = validateIdToken(
        { ...baseClaims(), aud: [CLIENT_ID, 'https://other-audience.example.com'], azp: CLIENT_ID },
        baseOptions(),
      );
      expect(correctAzp.ok).to.equal(true);
    },
  },
  {
    name: 'validateIdToken rejects a token whose aud does not contain client_id at all',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const result = validateIdToken({ ...baseClaims(), aud: 'https://someone-elses-app.example.com' }, baseOptions());
      expect(result.ok).to.equal(false);
    },
  },
  {
    name: 'validateIdToken enforces max_age against auth_time, requiring auth_time when max_age is set',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const noAuthTime = validateIdToken(baseClaims(), { ...baseOptions(), maxAgeSeconds: 3600 });
      expect(noAuthTime.ok).to.equal(false);

      const staleAuth = validateIdToken(
        { ...baseClaims(), auth_time: NOW - 7200 },
        { ...baseOptions(), maxAgeSeconds: 3600 },
      );
      expect(staleAuth.ok).to.equal(false);

      const freshAuth = validateIdToken(
        { ...baseClaims(), auth_time: NOW - 100 },
        { ...baseOptions(), maxAgeSeconds: 3600 },
      );
      expect(freshAuth.ok).to.equal(true);
    },
  },
  {
    name: 'validateIdToken collects multiple simultaneous errors rather than stopping at the first',
    run: async ({ mod, expect }) => {
      const { validateIdToken } = mod as unknown as Mod;
      const result = validateIdToken(
        { iss: 'https://wrong.example.com', aud: 'someone-else', exp: NOW - 1000, nonce: 'wrong' },
        baseOptions(),
      );
      expect(result.ok).to.equal(false);
      expect(result.errors.length).to.be.greaterThan(2);
    },
  },
  {
    name: 'redirectUriAllowed accepts an exact match and rejects any difference in path or scheme',
    run: async ({ mod, expect }) => {
      const { redirectUriAllowed } = mod as unknown as Mod;
      expect(redirectUriAllowed('https://app.example.com/callback', 'https://app.example.com/callback')).to.equal(
        true,
      );
      expect(redirectUriAllowed('https://app.example.com/callback', 'https://app.example.com/callback/')).to.equal(
        false,
      );
      expect(redirectUriAllowed('https://app.example.com/callback', 'http://app.example.com/callback')).to.equal(
        false,
      );
    },
  },
  {
    name: 'redirectUriAllowed applies the RFC 8252 loopback exception for a differing port only',
    run: async ({ mod, expect }) => {
      const { redirectUriAllowed } = mod as unknown as Mod;
      expect(redirectUriAllowed('http://127.0.0.1/callback', 'http://127.0.0.1:54231/callback')).to.equal(true);
      expect(redirectUriAllowed('http://localhost:1234/callback', 'http://localhost:9999/callback')).to.equal(true);
      // Different path still fails even on loopback.
      expect(redirectUriAllowed('http://127.0.0.1/callback', 'http://127.0.0.1:54231/other')).to.equal(false);
      // Non-loopback host never gets the port exception.
      expect(redirectUriAllowed('https://app.example.com/callback', 'https://app.example.com:8443/callback')).to.equal(
        false,
      );
    },
  },
  {
    name: 'redirectUriAllowed never treats a registered wildcard as a pattern',
    run: async ({ mod, expect }) => {
      const { redirectUriAllowed } = mod as unknown as Mod;
      expect(redirectUriAllowed('https://app.example.com/*', 'https://app.example.com/callback')).to.equal(false);
      expect(redirectUriAllowed('https://app.example.com/*', 'https://app.example.com/anything-else')).to.equal(
        false,
      );
    },
  },
];
