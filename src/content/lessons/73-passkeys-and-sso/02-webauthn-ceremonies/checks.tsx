import type { Check } from '../../../types';

type Mod = {
  buildRegistrationOptions: (input: {
    rpId: string;
    rpName: string;
    user: { id: string; name: string; displayName: string };
    challenge: string;
    existingCredentialIds: string[];
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'discouraged' | 'preferred' | 'required';
  }) => {
    rp: { id: string; name: string };
    user: { id: string; name: string; displayName: string };
    challenge: string;
    pubKeyCredParams: { type: 'public-key'; alg: number }[];
    authenticatorSelection: { residentKey: string; userVerification: string };
    attestation: 'none';
    excludeCredentials: { type: 'public-key'; id: string }[];
    timeout: number;
  };
  buildAuthenticationOptions: (input: {
    rpId: string;
    challenge: string;
    allowCredentials: string[];
    mediation?: 'conditional' | 'optional' | 'required' | 'silent';
  }) => {
    publicKey: {
      rpId: string;
      challenge: string;
      allowCredentials: { type: 'public-key'; id: string }[];
      userVerification: string;
      timeout: number;
    };
    mediation: string;
  };
  verifyClientData: (
    clientDataJSONBase64url: string,
    expectations: {
      expectedType: 'webauthn.create' | 'webauthn.get';
      expectedChallenge: string;
      expectedOrigins: string[];
      allowCrossOrigin?: boolean;
    },
  ) => { ok: boolean; errors: string[] };
  parseAuthenticatorFlags: (byte: number) => {
    userPresent: boolean;
    userVerified: boolean;
    backupEligible: boolean;
    backupState: boolean;
    attestedCredentialData: boolean;
    extensionData: boolean;
  };
};

/** Base64url-encodes a plain-object clientDataJSON fixture, the same shape a browser produces. */
function encodeClientData(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj);
  let binary = '';
  for (let i = 0; i < json.length; i++) binary += String.fromCharCode(json.charCodeAt(i));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const CHALLENGE = 'Y2hhbGxlbmdlLTE';
const ORIGIN = 'https://app.example.com';

const GOOD_GET = encodeClientData({ type: 'webauthn.get', challenge: CHALLENGE, origin: ORIGIN, crossOrigin: false });
const WRONG_TYPE = encodeClientData({ type: 'webauthn.create', challenge: CHALLENGE, origin: ORIGIN });
const WRONG_CHALLENGE = encodeClientData({ type: 'webauthn.get', challenge: 'not-the-challenge', origin: ORIGIN });
const WRONG_ORIGIN = encodeClientData({ type: 'webauthn.get', challenge: CHALLENGE, origin: 'https://evil.example' });
const CROSS_ORIGIN_UNALLOWED = encodeClientData({
  type: 'webauthn.get',
  challenge: CHALLENGE,
  origin: ORIGIN,
  crossOrigin: true,
});
const MALFORMED = 'not-valid-base64url-json';

export const checks: Check[] = [
  {
    name: 'buildRegistrationOptions puts ES256 (-7) before RS256 (-257) in pubKeyCredParams',
    run: async ({ mod, expect }) => {
      const { buildRegistrationOptions } = mod as unknown as Mod;
      const options = buildRegistrationOptions({
        rpId: 'example.com',
        rpName: 'Example',
        user: { id: 'u1', name: 'ada@example.com', displayName: 'Ada' },
        challenge: CHALLENGE,
        existingCredentialIds: [],
      });
      const algs = options.pubKeyCredParams.map((p) => p.alg);
      expect(algs[0]).to.equal(-7);
      expect(algs).to.include(-257);
      expect(options.pubKeyCredParams.every((p) => p.type === 'public-key')).to.equal(true);
    },
  },
  {
    name: 'buildRegistrationOptions defaults residentKey/userVerification to "preferred" and attestation to "none"',
    run: async ({ mod, expect }) => {
      const { buildRegistrationOptions } = mod as unknown as Mod;
      const options = buildRegistrationOptions({
        rpId: 'example.com',
        rpName: 'Example',
        user: { id: 'u1', name: 'ada@example.com', displayName: 'Ada' },
        challenge: CHALLENGE,
        existingCredentialIds: [],
      });
      expect(options.authenticatorSelection.residentKey).to.equal('preferred');
      expect(options.authenticatorSelection.userVerification).to.equal('preferred');
      expect(options.attestation).to.equal('none');
      expect(options.timeout).to.be.a('number');
      expect(options.timeout).to.be.greaterThan(0);
    },
  },
  {
    name: 'buildRegistrationOptions honors explicit residentKey/userVerification and maps excludeCredentials',
    run: async ({ mod, expect }) => {
      const { buildRegistrationOptions } = mod as unknown as Mod;
      const options = buildRegistrationOptions({
        rpId: 'example.com',
        rpName: 'Example',
        user: { id: 'u1', name: 'ada@example.com', displayName: 'Ada' },
        challenge: CHALLENGE,
        existingCredentialIds: ['cred-a', 'cred-b'],
        residentKey: 'required',
        userVerification: 'required',
      });
      expect(options.authenticatorSelection.residentKey).to.equal('required');
      expect(options.authenticatorSelection.userVerification).to.equal('required');
      expect(options.excludeCredentials).to.deep.equal([
        { type: 'public-key', id: 'cred-a' },
        { type: 'public-key', id: 'cred-b' },
      ]);
    },
  },
  {
    name: 'buildAuthenticationOptions maps allowCredentials and defaults mediation to "optional"',
    run: async ({ mod, expect }) => {
      const { buildAuthenticationOptions } = mod as unknown as Mod;
      const options = buildAuthenticationOptions({
        rpId: 'example.com',
        challenge: CHALLENGE,
        allowCredentials: ['cred-a'],
      });
      expect(options.mediation).to.equal('optional');
      expect(options.publicKey.allowCredentials).to.deep.equal([{ type: 'public-key', id: 'cred-a' }]);
      expect(options.publicKey.rpId).to.equal('example.com');
      expect(options.publicKey.challenge).to.equal(CHALLENGE);
    },
  },
  {
    name: 'buildAuthenticationOptions forces allowCredentials to [] under conditional mediation, even if some were passed',
    run: async ({ mod, expect }) => {
      const { buildAuthenticationOptions } = mod as unknown as Mod;
      const options = buildAuthenticationOptions({
        rpId: 'example.com',
        challenge: CHALLENGE,
        allowCredentials: ['cred-a', 'cred-b'],
        mediation: 'conditional',
      });
      expect(options.mediation).to.equal('conditional');
      expect(options.publicKey.allowCredentials).to.deep.equal([]);
    },
  },
  {
    name: 'verifyClientData accepts a clientDataJSON matching every expectation',
    run: async ({ mod, expect }) => {
      const { verifyClientData } = mod as unknown as Mod;
      const result = verifyClientData(GOOD_GET, {
        expectedType: 'webauthn.get',
        expectedChallenge: CHALLENGE,
        expectedOrigins: [ORIGIN],
      });
      expect(result.ok).to.equal(true);
      expect(result.errors).to.have.length(0);
    },
  },
  {
    name: 'verifyClientData reports a type mismatch',
    run: async ({ mod, expect }) => {
      const { verifyClientData } = mod as unknown as Mod;
      const result = verifyClientData(WRONG_TYPE, {
        expectedType: 'webauthn.get',
        expectedChallenge: CHALLENGE,
        expectedOrigins: [ORIGIN],
      });
      expect(result.ok).to.equal(false);
      expect(result.errors).to.include('type mismatch');
    },
  },
  {
    name: 'verifyClientData reports a challenge mismatch',
    run: async ({ mod, expect }) => {
      const { verifyClientData } = mod as unknown as Mod;
      const result = verifyClientData(WRONG_CHALLENGE, {
        expectedType: 'webauthn.get',
        expectedChallenge: CHALLENGE,
        expectedOrigins: [ORIGIN],
      });
      expect(result.ok).to.equal(false);
      expect(result.errors).to.include('challenge mismatch');
    },
  },
  {
    name: 'verifyClientData reports an origin that is not in the allowed list, and collects multiple errors at once',
    run: async ({ mod, expect }) => {
      const { verifyClientData } = mod as unknown as Mod;
      const result = verifyClientData(WRONG_ORIGIN, {
        expectedType: 'webauthn.get',
        expectedChallenge: 'a-different-challenge',
        expectedOrigins: [ORIGIN],
      });
      expect(result.ok).to.equal(false);
      expect(result.errors).to.include('origin not allowed');
      expect(result.errors).to.include('challenge mismatch');
      expect(result.errors.length).to.be.greaterThan(1);
    },
  },
  {
    name: 'verifyClientData rejects crossOrigin: true unless allowCrossOrigin is set, and accepts it when allowed',
    run: async ({ mod, expect }) => {
      const { verifyClientData } = mod as unknown as Mod;
      const denied = verifyClientData(CROSS_ORIGIN_UNALLOWED, {
        expectedType: 'webauthn.get',
        expectedChallenge: CHALLENGE,
        expectedOrigins: [ORIGIN],
      });
      expect(denied.ok).to.equal(false);
      expect(denied.errors).to.include('cross-origin not allowed');

      const allowed = verifyClientData(CROSS_ORIGIN_UNALLOWED, {
        expectedType: 'webauthn.get',
        expectedChallenge: CHALLENGE,
        expectedOrigins: [ORIGIN],
        allowCrossOrigin: true,
      });
      expect(allowed.ok).to.equal(true);
    },
  },
  {
    name: 'verifyClientData never throws, even for a malformed payload -- it reports an error instead',
    run: async ({ mod, expect }) => {
      const { verifyClientData } = mod as unknown as Mod;
      const result = verifyClientData(MALFORMED, {
        expectedType: 'webauthn.get',
        expectedChallenge: CHALLENGE,
        expectedOrigins: [ORIGIN],
      });
      expect(result.ok).to.equal(false);
      expect(result.errors.length).to.be.greaterThan(0);
    },
  },
  {
    name: 'parseAuthenticatorFlags decodes user-present, user-verified, backup-eligible/state bits independently',
    run: async ({ mod, expect }) => {
      const { parseAuthenticatorFlags } = mod as unknown as Mod;
      // UP + UV only (0x01 | 0x04): a security key, not synced.
      const hardwareKey = parseAuthenticatorFlags(0b0000_0101);
      expect(hardwareKey.userPresent).to.equal(true);
      expect(hardwareKey.userVerified).to.equal(true);
      expect(hardwareKey.backupEligible).to.equal(false);
      expect(hardwareKey.backupState).to.equal(false);

      // UP + UV + BE + BS (0x01 | 0x04 | 0x08 | 0x10): a synced passkey, currently backed up.
      const syncedPasskey = parseAuthenticatorFlags(0b0001_1101);
      expect(syncedPasskey.userPresent).to.equal(true);
      expect(syncedPasskey.userVerified).to.equal(true);
      expect(syncedPasskey.backupEligible).to.equal(true);
      expect(syncedPasskey.backupState).to.equal(true);

      // Only UP (0x01): present but not verified -- e.g. userVerification: 'discouraged'.
      const presentOnly = parseAuthenticatorFlags(0b0000_0001);
      expect(presentOnly.userPresent).to.equal(true);
      expect(presentOnly.userVerified).to.equal(false);
    },
  },
  {
    name: 'parseAuthenticatorFlags decodes attestedCredentialData (AT, 0x40) and extensionData (ED, 0x80)',
    run: async ({ mod, expect }) => {
      const { parseAuthenticatorFlags } = mod as unknown as Mod;
      const withAttestedData = parseAuthenticatorFlags(0b0100_0001);
      expect(withAttestedData.attestedCredentialData).to.equal(true);
      expect(withAttestedData.extensionData).to.equal(false);

      const withExtensions = parseAuthenticatorFlags(0b1000_0001);
      expect(withExtensions.extensionData).to.equal(true);
      expect(withExtensions.attestedCredentialData).to.equal(false);
    },
  },
];
