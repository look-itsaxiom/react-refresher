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

// COSE algorithm identifiers. ES256 first: it's the algorithm nearly every
// platform authenticator supports, and putting it first is what authenticators
// use as a tiebreaker when several offered algorithms would work.
const ES256 = -7;
const RS256 = -257;

const DEFAULT_TIMEOUT_MS = 60_000;

// ---- Registration ---------------------------------------------------------

/** Builds a spec-shaped PublicKeyCredentialCreationOptions-like object. */
export function buildRegistrationOptions(input: RegistrationInput): RegistrationOptions {
  return {
    rp: { id: input.rpId, name: input.rpName },
    user: { id: input.user.id, name: input.user.name, displayName: input.user.displayName },
    challenge: input.challenge,
    pubKeyCredParams: [
      { type: 'public-key', alg: ES256 },
      { type: 'public-key', alg: RS256 },
    ],
    authenticatorSelection: {
      residentKey: input.residentKey ?? 'preferred',
      userVerification: input.userVerification ?? 'preferred',
    },
    attestation: 'none',
    excludeCredentials: input.existingCredentialIds.map((id) => ({ type: 'public-key' as const, id })),
    timeout: DEFAULT_TIMEOUT_MS,
  };
}

// ---- Authentication ---------------------------------------------------------

/**
 * Builds a spec-shaped PublicKeyCredentialRequestOptions-like object, wrapped
 * with the `mediation` value it's passed alongside (mediation isn't part of
 * `publicKey` itself -- it's a sibling field on the CredentialRequestOptions
 * passed to `navigator.credentials.get`).
 *
 * Under conditional mediation (autofill UI), `allowCredentials` must be empty:
 * the whole point is that the browser looks up discoverable credentials for
 * this rpId on its own, keyed off which field the user is focused in, not off
 * a list the server already knows to send.
 */
export function buildAuthenticationOptions(input: AuthenticationInput): AuthenticationOptions {
  const mediation = input.mediation ?? 'optional';
  const allowCredentials =
    mediation === 'conditional' ? [] : input.allowCredentials.map((id) => ({ type: 'public-key' as const, id }));

  return {
    publicKey: {
      rpId: input.rpId,
      challenge: input.challenge,
      allowCredentials,
      userVerification: 'preferred',
      timeout: DEFAULT_TIMEOUT_MS,
    },
    mediation,
  };
}

// ---- clientDataJSON verification ------------------------------------------

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Decodes and checks a base64url-encoded clientDataJSON against what the
 * relying party expects. Never throws -- collects every applicable error
 * instead of stopping at the first one, the same shape as JWT claim
 * validation, because a caller deciding whether to reject a ceremony wants
 * to see everything that's wrong, not just the first mismatch.
 */
export function verifyClientData(
  clientDataJSONBase64url: string,
  expectations: ClientDataExpectations,
): ClientDataVerification {
  let clientData: {
    type?: string;
    challenge?: string;
    origin?: string;
    crossOrigin?: boolean;
    topOrigin?: string;
  };
  try {
    clientData = JSON.parse(base64UrlDecode(clientDataJSONBase64url));
  } catch {
    return { ok: false, errors: ['malformed clientDataJSON'] };
  }

  const errors: string[] = [];

  if (clientData.type !== expectations.expectedType) {
    errors.push('type mismatch');
  }
  if (clientData.challenge !== expectations.expectedChallenge) {
    errors.push('challenge mismatch');
  }
  if (!clientData.origin || !expectations.expectedOrigins.includes(clientData.origin)) {
    errors.push('origin not allowed');
  }
  if (clientData.crossOrigin === true && !expectations.allowCrossOrigin) {
    errors.push('cross-origin not allowed');
  }

  return { ok: errors.length === 0, errors };
}

// ---- authenticatorData flags byte -----------------------------------------

/**
 * Parses the single flags byte from authenticatorData. Bit layout (WebAuthn
 * Level 3): UP=0x01, RFU1=0x02, UV=0x04, BE=0x08, BS=0x10, RFU2=0x20,
 * AT=0x40, ED=0x80.
 */
export function parseAuthenticatorFlags(byte: number): AuthenticatorFlags {
  return {
    userPresent: (byte & 0x01) !== 0,
    userVerified: (byte & 0x04) !== 0,
    backupEligible: (byte & 0x08) !== 0,
    backupState: (byte & 0x10) !== 0,
    attestedCredentialData: (byte & 0x40) !== 0,
    extensionData: (byte & 0x80) !== 0,
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

  const flags = parseAuthenticatorFlags(0b0000_1101); // UP + UV + BE, not synced yet

  return (
    <div>
      <h3>Registration options</h3>
      <pre>{JSON.stringify(registration, null, 2)}</pre>
      <h3>Sample authenticatorData flags (0b00001101)</h3>
      <pre>{JSON.stringify(flags, null, 2)}</pre>
    </div>
  );
}
