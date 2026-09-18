import type { Check } from '../../../types';

type Mod = {
  decodeJwt: (token: string) => { header: Record<string, unknown>; payload: Record<string, unknown> };
  verifyHs256: (token: string, secret: string) => Promise<boolean>;
  validateClaims: (
    payload: Record<string, unknown>,
    options: { now: number; issuer?: string; audience?: string; leewaySeconds?: number },
  ) => { ok: boolean; errors: string[] };
};

// All vectors below were generated with Node's Web Crypto (crypto.subtle),
// the same implementation jsdom exposes, using the fixed secret
// 'lesson-71-hmac-secret' and a fixed "now" of 1_800_000_000 seconds.
const SECRET = 'lesson-71-hmac-secret';
const NOW = 1_800_000_000;

const VALID =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQyIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3OTk5OTk5NDAsIm5iZiI6MTc5OTk5OTk0MCwiZXhwIjoxODAwMDAzNjAwLCJqdGkiOiJ0b2stMSJ9.c7xv__-IK2hEk2q07QJS3y4Db2Fn5vYRBWVGN-fiWeo';
const TAMPERED =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTk5OSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIiwiaWF0IjoxNzk5OTk5OTQwLCJuYmYiOjE3OTk5OTk5NDAsImV4cCI6MTgwMDAwMzYwMCwianRpIjoidG9rLTEifQ.c7xv__-IK2hEk2q07QJS3y4Db2Fn5vYRBWVGN-fiWeo';
const ALG_NONE =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1c2VyLTQyIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3OTk5OTk5NDAsIm5iZiI6MTc5OTk5OTk0MCwiZXhwIjoxODAwMDAzNjAwLCJqdGkiOiJ0b2stMSJ9.';
const ALG_HS512 =
  'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQyIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3OTk5OTk5NDAsIm5iZiI6MTc5OTk5OTk0MCwiZXhwIjoxODAwMDAzNjAwLCJqdGkiOiJ0b2stMSJ9.a_RBm6DIeeP9Y7GoZYih34GmYiSl-vvp2HNWk_oE4ZE';
const AUD_ARRAY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQyIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjpbImh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIiwiaHR0cHM6Ly9vdGhlci5leGFtcGxlLmNvbSJdLCJpYXQiOjE3OTk5OTk5NDAsIm5iZiI6MTc5OTk5OTk0MCwiZXhwIjoxODAwMDAzNjAwLCJqdGkiOiJ0b2stNCJ9.adlvO7XENuXhnCRpeMjxgTEqHhNsAAqVAMFzgBHxaqk';

const ISS = 'https://auth.example.com';
const AUD = 'https://api.example.com';

export const checks: Check[] = [
  {
    name: 'decodeJwt returns the header and payload of a well-formed token',
    run: async ({ mod, expect }) => {
      const { decodeJwt } = mod as unknown as Mod;
      const { header, payload } = decodeJwt(VALID);
      expect(header.alg).to.equal('HS256');
      expect(payload.sub).to.equal('user-42');
      expect(payload.aud).to.equal(AUD);
    },
  },
  {
    name: 'decodeJwt throws for a token that does not have exactly 3 segments',
    run: async ({ mod, expect }) => {
      const { decodeJwt } = mod as unknown as Mod;
      expect(() => decodeJwt('only.two')).to.throw();
      expect(() => decodeJwt('a.b.c.d')).to.throw();
    },
  },
  {
    name: 'decodeJwt throws when a segment does not decode to valid JSON',
    run: async ({ mod, expect }) => {
      const { decodeJwt } = mod as unknown as Mod;
      const badPayloadToken = `${VALID.split('.')[0]}.bm90LWpzb24tYXQtYWxs.sig`;
      expect(() => decodeJwt(badPayloadToken)).to.throw();
    },
  },
  {
    name: 'verifyHs256 returns true for a validly-signed token and the right secret',
    run: async ({ mod, expect }) => {
      const { verifyHs256 } = mod as unknown as Mod;
      expect(await verifyHs256(VALID, SECRET)).to.equal(true);
    },
  },
  {
    name: 'verifyHs256 returns false when the payload was tampered with after signing',
    run: async ({ mod, expect }) => {
      const { verifyHs256 } = mod as unknown as Mod;
      expect(await verifyHs256(TAMPERED, SECRET)).to.equal(false);
    },
  },
  {
    name: 'verifyHs256 returns false for the wrong secret',
    run: async ({ mod, expect }) => {
      const { verifyHs256 } = mod as unknown as Mod;
      expect(await verifyHs256(VALID, 'wrong-secret')).to.equal(false);
    },
  },
  {
    name: "verifyHs256 rejects alg: none even with the correct secret",
    run: async ({ mod, expect }) => {
      const { verifyHs256 } = mod as unknown as Mod;
      expect(await verifyHs256(ALG_NONE, SECRET)).to.equal(false);
    },
  },
  {
    name: 'verifyHs256 rejects a non-HS256 alg header even when the underlying bytes are a valid HMAC-SHA256',
    run: async ({ mod, expect }) => {
      const { verifyHs256 } = mod as unknown as Mod;
      // ALG_HS512 is signed with genuine HMAC-SHA256 over its header+payload,
      // but its header claims alg: HS512. A correct verifier rejects it
      // because it only ever checks HS256, regardless of whether the bytes
      // "happen to" match -- it must not dispatch on the token's own alg.
      expect(await verifyHs256(ALG_HS512, SECRET)).to.equal(false);
    },
  },
  {
    name: 'validateClaims accepts a token within its validity window, issuer, and audience',
    run: async ({ mod, expect }) => {
      const { decodeJwt, validateClaims } = mod as unknown as Mod;
      const { payload } = decodeJwt(VALID);
      const result = validateClaims(payload, { now: NOW, issuer: ISS, audience: AUD });
      expect(result.ok).to.equal(true);
      expect(result.errors).to.have.length(0);
    },
  },
  {
    name: 'validateClaims rejects an expired token, applying leeway correctly',
    run: async ({ mod, expect }) => {
      const { validateClaims } = mod as unknown as Mod;
      const payload = { exp: NOW - 100 };
      // Just past a 60s leeway: still expired.
      const stillExpired = validateClaims(payload, { now: NOW, leewaySeconds: 60 });
      expect(stillExpired.ok).to.equal(false);
      expect(stillExpired.errors.length).to.be.greaterThan(0);
      // Within a 120s leeway: not expired.
      const withinLeeway = validateClaims(payload, { now: NOW, leewaySeconds: 120 });
      expect(withinLeeway.ok).to.equal(true);
    },
  },
  {
    name: 'validateClaims rejects a token not yet valid (nbf in the future)',
    run: async ({ mod, expect }) => {
      const { validateClaims } = mod as unknown as Mod;
      const result = validateClaims({ nbf: NOW + 100 }, { now: NOW });
      expect(result.ok).to.equal(false);
    },
  },
  {
    name: 'validateClaims rejects a mismatched issuer or a string audience that does not match',
    run: async ({ mod, expect }) => {
      const { decodeJwt, validateClaims } = mod as unknown as Mod;
      const { payload } = decodeJwt(VALID);
      expect(validateClaims(payload, { now: NOW, issuer: 'https://not-the-issuer.example.com' }).ok).to.equal(false);
      expect(validateClaims(payload, { now: NOW, audience: 'https://not-the-audience.example.com' }).ok).to.equal(
        false,
      );
    },
  },
  {
    name: 'validateClaims treats an array audience as satisfied by containment',
    run: async ({ mod, expect }) => {
      const { decodeJwt, validateClaims } = mod as unknown as Mod;
      const { payload } = decodeJwt(AUD_ARRAY);
      expect(validateClaims(payload, { now: NOW, audience: AUD }).ok).to.equal(true);
      expect(validateClaims(payload, { now: NOW, audience: 'https://not-in-the-list.example.com' }).ok).to.equal(
        false,
      );
    },
  },
];
