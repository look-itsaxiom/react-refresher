import { useState } from 'react';

export type IdTokenClaims = {
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

export type ValidateIdTokenOptions = {
  issuer: string;
  clientId: string;
  nonce: string;
  /** Seconds since the Unix epoch. */
  now: number;
  maxAgeSeconds?: number;
  leewaySeconds?: number;
};

export type IdTokenValidationResult = { ok: boolean; errors: string[] };

/**
 * Validates an already signature-verified ID token's claims against the
 * client's expectations. Call this only after the JWT signature has been
 * checked against the issuer's JWKS (lesson 71) -- this function trusts
 * its input's authenticity and only checks whether the claims themselves
 * are the ones this client should accept.
 *
 * TODO: implement, collecting every applicable error (don't stop at the
 * first failure) into `errors`; `ok` is true only when `errors` is empty.
 *
 * - `iss`: error unless it exactly equals `options.issuer`.
 * - `aud`: error unless it equals `options.clientId` (string case) or
 *   contains it (array case).
 * - `azp` rule: if `aud` is an array with more than one entry, `azp` is
 *   REQUIRED and must equal `options.clientId` -- error if either fails.
 *   If `aud` is a single string (or a one-element array) equal to
 *   `options.clientId`, `azp` is optional, but if present it must equal
 *   `options.clientId`.
 * - `exp`/`iat`: with `leeway = options.leewaySeconds ?? 0`, error if
 *   `exp` is missing, or if `options.now > exp + leeway`.
 * - `nonce`: error unless `claims.nonce === options.nonce`.
 * - `auth_time`/`max_age`: only when `options.maxAgeSeconds` is set, error
 *   if `auth_time` is missing, or if
 *   `options.now - auth_time > options.maxAgeSeconds + leeway`.
 */
export function validateIdToken(
  claims: IdTokenClaims,
  options: ValidateIdTokenOptions,
): IdTokenValidationResult {
  throw new Error('not implemented');
}

/**
 * Decides whether `actual` is an acceptable redirect for a client that
 * registered `registered`. Exact match always wins. The one exception is
 * the RFC 8252 loopback carve-out for native/dev clients: a registered
 * loopback URI (host `127.0.0.1`, `::1`, or `localhost`) may match an
 * actual URI on a *different port*, as long as scheme, host, path, and
 * query all otherwise match exactly. A registered URI containing `*` is
 * never treated as a pattern -- it can only ever match itself literally,
 * which (since it contains a character no real redirect URI would) means
 * it never matches anything.
 *
 * TODO: implement.
 */
export function redirectUriAllowed(registered: string, actual: string): boolean {
  throw new Error('not implemented');
}

export default function App() {
  const [result] = useState(() => {
    try {
      return redirectUriAllowed('https://app.example.com/callback', 'https://app.example.com/callback');
    } catch {
      return null;
    }
  });

  return <pre>{result === null ? 'not implemented yet' : `redirectUriAllowed: ${result}`}</pre>;
}
