import type { Check } from '../../../types';

type Mod = {
  generateVerifier: (length?: number, randomSource?: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>) => string;
  codeChallenge: (verifier: string) => Promise<string>;
  buildAuthorizeUrl: (params: {
    issuerAuthorizeEndpoint: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
    state: string;
    nonce: string;
    challenge: string;
  }) => string;
  validateCallback: (
    callbackUrl: string,
    options: { expectedState: string; expectedIssuer?: string },
  ) => { ok: true; code: string } | { ok: false; error: string };
};

// RFC 7636 Appendix B test vector.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

export const checks: Check[] = [
  {
    name: 'generateVerifier produces a string of the requested length using only unreserved characters',
    run: async ({ mod, expect }) => {
      const { generateVerifier } = mod as unknown as Mod;
      const verifier = generateVerifier(64, (bytes) => {
        for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 5) % 256;
        return bytes;
      });
      expect(verifier).to.have.length(64);
      expect(verifier).to.match(/^[A-Za-z0-9\-._~]+$/);
    },
  },
  {
    name: 'generateVerifier defaults to a length within the 43-128 range and uses crypto.getRandomValues by default',
    run: async ({ mod, expect }) => {
      const { generateVerifier } = mod as unknown as Mod;
      const verifier = generateVerifier();
      expect(verifier.length).to.be.at.least(43);
      expect(verifier.length).to.be.at.most(128);
      expect(verifier).to.match(/^[A-Za-z0-9\-._~]+$/);
      const another = generateVerifier();
      expect(another).to.not.equal(verifier);
    },
  },
  {
    name: 'generateVerifier throws for a length outside 43-128',
    run: async ({ mod, expect }) => {
      const { generateVerifier } = mod as unknown as Mod;
      expect(() => generateVerifier(42)).to.throw();
      expect(() => generateVerifier(129)).to.throw();
    },
  },
  {
    name: 'generateVerifier is deterministic given a deterministic randomSource',
    run: async ({ mod, expect }) => {
      const { generateVerifier } = mod as unknown as Mod;
      const source = (bytes: Uint8Array<ArrayBuffer>) => {
        for (let i = 0; i < bytes.length; i++) bytes[i] = 9;
        return bytes;
      };
      expect(generateVerifier(50, source)).to.equal(generateVerifier(50, source));
    },
  },
  {
    name: 'codeChallenge matches the RFC 7636 Appendix B test vector',
    run: async ({ mod, expect }) => {
      const { codeChallenge } = mod as unknown as Mod;
      expect(await codeChallenge(RFC_VERIFIER)).to.equal(RFC_CHALLENGE);
    },
  },
  {
    name: 'codeChallenge produces a base64url string with no padding characters',
    run: async ({ mod, expect }) => {
      const { codeChallenge } = mod as unknown as Mod;
      const challenge = await codeChallenge('some-other-verifier-value-1234567890');
      expect(challenge).to.not.match(/[+/=]/);
    },
  },
  {
    name: 'buildAuthorizeUrl sets every required query parameter correctly, space-joining scopes',
    run: async ({ mod, expect }) => {
      const { buildAuthorizeUrl } = mod as unknown as Mod;
      const raw = buildAuthorizeUrl({
        issuerAuthorizeEndpoint: 'https://auth.example.com/authorize',
        clientId: 'client-123',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'profile', 'email'],
        state: 'state-abc',
        nonce: 'nonce-xyz',
        challenge: RFC_CHALLENGE,
      });
      const url = new URL(raw);
      expect(url.origin + url.pathname).to.equal('https://auth.example.com/authorize');
      expect(url.searchParams.get('response_type')).to.equal('code');
      expect(url.searchParams.get('client_id')).to.equal('client-123');
      expect(url.searchParams.get('redirect_uri')).to.equal('https://app.example.com/callback');
      expect(url.searchParams.get('scope')).to.equal('openid profile email');
      expect(url.searchParams.get('state')).to.equal('state-abc');
      expect(url.searchParams.get('nonce')).to.equal('nonce-xyz');
      expect(url.searchParams.get('code_challenge')).to.equal(RFC_CHALLENGE);
      expect(url.searchParams.get('code_challenge_method')).to.equal('S256');
    },
  },
  {
    name: 'validateCallback accepts a well-formed callback',
    run: async ({ mod, expect }) => {
      const { validateCallback } = mod as unknown as Mod;
      const result = validateCallback(
        'https://app.example.com/callback?code=abc123&state=expected-state',
        { expectedState: 'expected-state' },
      );
      expect(result.ok).to.equal(true);
      expect((result as { ok: true; code: string }).code).to.equal('abc123');
    },
  },
  {
    name: 'validateCallback rejects a state mismatch before looking at anything else',
    run: async ({ mod, expect }) => {
      const { validateCallback } = mod as unknown as Mod;
      const result = validateCallback(
        'https://app.example.com/callback?error=access_denied&state=wrong-state&code=abc123',
        { expectedState: 'expected-state' },
      );
      expect(result.ok).to.equal(false);
      expect((result as { ok: false; error: string }).error).to.equal('state_mismatch');
    },
  },
  {
    name: 'validateCallback surfaces the error param verbatim once state matches',
    run: async ({ mod, expect }) => {
      const { validateCallback } = mod as unknown as Mod;
      const result = validateCallback(
        'https://app.example.com/callback?error=access_denied&state=expected-state',
        { expectedState: 'expected-state' },
      );
      expect(result.ok).to.equal(false);
      expect((result as { ok: false; error: string }).error).to.equal('access_denied');
    },
  },
  {
    name: 'validateCallback rejects a missing code when there is no error param',
    run: async ({ mod, expect }) => {
      const { validateCallback } = mod as unknown as Mod;
      const result = validateCallback('https://app.example.com/callback?state=expected-state', {
        expectedState: 'expected-state',
      });
      expect(result.ok).to.equal(false);
      expect((result as { ok: false; error: string }).error).to.equal('missing_code');
    },
  },
  {
    name: 'validateCallback checks iss against expectedIssuer (RFC 9207) only when both are present',
    run: async ({ mod, expect }) => {
      const { validateCallback } = mod as unknown as Mod;
      const mismatched = validateCallback(
        'https://app.example.com/callback?code=abc123&state=expected-state&iss=https%3A%2F%2Fattacker.example.com',
        { expectedState: 'expected-state', expectedIssuer: 'https://auth.example.com' },
      );
      expect(mismatched.ok).to.equal(false);
      expect((mismatched as { ok: false; error: string }).error).to.equal('issuer_mismatch');

      const matched = validateCallback(
        'https://app.example.com/callback?code=abc123&state=expected-state&iss=https%3A%2F%2Fauth.example.com',
        { expectedState: 'expected-state', expectedIssuer: 'https://auth.example.com' },
      );
      expect(matched.ok).to.equal(true);

      const noIssInCallback = validateCallback(
        'https://app.example.com/callback?code=abc123&state=expected-state',
        { expectedState: 'expected-state', expectedIssuer: 'https://auth.example.com' },
      );
      expect(noIssInCallback.ok).to.equal(true);
    },
  },
];
