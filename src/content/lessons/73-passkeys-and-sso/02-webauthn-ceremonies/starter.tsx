import { useMemo } from 'react';

// ---- Shared shapes -------------------------------------------------------

export type RegistrationInput = {
  rpId: string;
  rpName: string;
  user: { id: string; name: string; displayName: string };
  /** Base64url-encoded challenge, already generated server-side. */
  challenge: string;
  /** Base64url-encoded credential ids already registered to this user. */
  existingCredentialIds: string[];
  residentKey?: 'discouraged' | 'preferred' | 'required';
  userVerification?: 'discouraged' | 'preferred' | 'required';
};

export type RegistrationOptions = {
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  authenticatorSelection: {
    residentKey: 'discouraged' | 'preferred' | 'required';
    userVerification: 'discouraged' | 'preferred' | 'required';
  };
  attestation: 'none';
  excludeCredentials: { type: 'public-key'; id: string }[];
  timeout: number;
};

export type AuthenticationInput = {
  rpId: string;
  /** Base64url-encoded challenge, already generated server-side. */
  challenge: string;
  /** Base64url-encoded credential ids to allow. Ignored under conditional mediation. */
  allowCredentials: string[];
  mediation?: 'conditional' | 'optional' | 'required' | 'silent';
};

export type AuthenticationOptions = {
  publicKey: {
    rpId: string;
    challenge: string;
    allowCredentials: { type: 'public-key'; id: string }[];
    userVerification: 'preferred';
    timeout: number;
  };
  mediation: 'conditional' | 'optional' | 'required' | 'silent';
};

export type ClientDataExpectations = {
  expectedType: 'webauthn.create' | 'webauthn.get';
  expectedChallenge: string;
  expectedOrigins: string[];
  allowCrossOrigin?: boolean;
};

export type ClientDataVerification = { ok: boolean; errors: string[] };

export type AuthenticatorFlags = {
  userPresent: boolean;
  userVerified: boolean;
  backupEligible: boolean;
  backupState: boolean;
  attestedCredentialData: boolean;
  extensionData: boolean;
};

const DEFAULT_TIMEOUT_MS = 60_000;

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

// ---- TODO: implement these four functions ---------------------------------

/**
 * Build a spec-shaped PublicKeyCredentialCreationOptions-like object.
 * ES256 (alg -7) must come before RS256 (alg -257) in pubKeyCredParams.
 * attestation is always 'none'. Map existingCredentialIds into
 * excludeCredentials as { type: 'public-key', id }.
 */
export function buildRegistrationOptions(input: RegistrationInput): RegistrationOptions {
  return {
    rp: { id: input.rpId, name: input.rpName },
    user: input.user,
    challenge: input.challenge,
    pubKeyCredParams: [],
    authenticatorSelection: { residentKey: 'discouraged', userVerification: 'discouraged' },
    attestation: 'none',
    excludeCredentials: [],
    timeout: DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Build a spec-shaped { publicKey, mediation } pair for
 * navigator.credentials.get(...). Under conditional mediation,
 * publicKey.allowCredentials must be [] regardless of what was passed in.
 */
export function buildAuthenticationOptions(input: AuthenticationInput): AuthenticationOptions {
  return {
    publicKey: {
      rpId: input.rpId,
      challenge: input.challenge,
      allowCredentials: input.allowCredentials.map((id) => ({ type: 'public-key' as const, id })),
      userVerification: 'preferred',
      timeout: DEFAULT_TIMEOUT_MS,
    },
    mediation: input.mediation ?? 'optional',
  };
}

/**
 * Decode a base64url clientDataJSON and check it against expectations.
 * Collect every applicable error into `errors` instead of stopping at the
 * first one. Never throw -- a malformed payload is its own error.
 */
export function verifyClientData(
  clientDataJSONBase64url: string,
  expectations: ClientDataExpectations,
): ClientDataVerification {
  const clientData = JSON.parse(base64UrlDecode(clientDataJSONBase64url));
  return { ok: true, errors: [] };
}

/**
 * Parse the authenticatorData flags byte. Bit layout (WebAuthn Level 3):
 * UP=0x01, UV=0x04, BE=0x08, BS=0x10, AT=0x40, ED=0x80.
 */
export function parseAuthenticatorFlags(byte: number): AuthenticatorFlags {
  return {
    userPresent: false,
    userVerified: false,
    backupEligible: false,
    backupState: false,
    attestedCredentialData: false,
    extensionData: false,
  };
}

// ---- default preview --------------------------------------------------------

export default function App() {
  const registration = useMemo(
    () =>
      buildRegistrationOptions({
        rpId: 'example.com',
        rpName: 'Example App',
        user: { id: 'dXNlci00Mg', name: 'ada@example.com', displayName: 'Ada' },
        challenge: 'Y2hhbGxlbmdlLTE',
        existingCredentialIds: [],
      }),
    [],
  );

  const flags = parseAuthenticatorFlags(0b0000_1101);

  return (
    <div>
      <h3>Registration options</h3>
      <pre>{JSON.stringify(registration, null, 2)}</pre>
      <h3>Sample authenticatorData flags (0b00001101)</h3>
      <pre>{JSON.stringify(flags, null, 2)}</pre>
    </div>
  );
}
