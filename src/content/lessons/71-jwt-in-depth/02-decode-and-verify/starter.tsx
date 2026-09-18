import { useState } from 'react';

export type JwtHeader = { alg: string; typ?: string; kid?: string };
export type JwtPayload = Record<string, unknown> & {
  exp?: number;
  nbf?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  sub?: string;
  jti?: string;
};

export type DecodedJwt = { header: JwtHeader; payload: JwtPayload };

export type ClaimsValidationOptions = {
  /** Seconds since the Unix epoch. */
  now: number;
  issuer?: string;
  audience?: string;
  leewaySeconds?: number;
};

export type ClaimsValidationResult = { ok: boolean; errors: string[] };

/** Base64url-decodes a single JWT segment into its original string. */
function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/** Base64url-encodes raw bytes (no padding, URL-safe alphabet). */
function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Splits a JWT into its header and payload objects. Decode-only -- does not
 * touch the signature. This is what a client-side `jwt-decode` call does.
 *
 * TODO: implement.
 * - Split `token` on '.'. A well-formed JWT has exactly 3 segments; throw
 *   an Error for anything else.
 * - base64url-decode the first two segments and JSON.parse each one. Throw
 *   an Error if either fails to parse.
 */
export function decodeJwt(token: string): DecodedJwt {
  throw new Error('not implemented');
}

/**
 * Verifies an HS256-signed JWT against `secret`. Returns false for any
 * token that doesn't verify -- including one that isn't even HS256 -- and
 * never throws for a malformed or wrongly-signed token.
 *
 * TODO: implement.
 * - Split into exactly 3 segments; anything else is not verified.
 * - Decode the header. If `header.alg !== 'HS256'`, return false. Do not
 *   branch on the token's own `alg` to decide how to check it -- this
 *   function only ever checks HS256, so any other value is an automatic
 *   reject, not a different code path.
 * - Recompute HMAC-SHA256 (via `crypto.subtle`) over the literal ASCII
 *   string `${headerSegment}.${payloadSegment}` -- the two segments AS
 *   WRITTEN in the token, not decoded -- then base64url-encode the result.
 * - Return whether that matches the token's third segment exactly.
 */
export async function verifyHs256(token: string, secret: string): Promise<boolean> {
  throw new Error('not implemented');
}

/**
 * Validates claims on an already-decoded payload. Call this only after
 * `verifyHs256` has returned true -- this function trusts its input.
 *
 * TODO: implement.
 * - `exp`: if present, record an error when `now > exp + leewaySeconds`.
 * - `nbf`: if present, record an error when `now < nbf - leewaySeconds`.
 * - `iss`: if `options.issuer` is set, record an error unless
 *   `payload.iss` matches it exactly.
 * - `aud`: if `options.audience` is set, record an error unless
 *   `payload.aud` equals it (when a string) or contains it (when an array).
 * - `leewaySeconds` defaults to 0 when not given.
 * - Collect every applicable error rather than stopping at the first one.
 *   `ok` is true only when `errors` ends up empty.
 */
export function validateClaims(payload: JwtPayload, options: ClaimsValidationOptions): ClaimsValidationResult {
  throw new Error('not implemented');
}

const SAMPLE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQyIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3OTk5OTk5NDAsIm5iZiI6MTc5OTk5OTk0MCwiZXhwIjoxODAwMDAzNjAwLCJqdGkiOiJ0b2stMSJ9.c7xv__-IK2hEk2q07QJS3y4Db2Fn5vYRBWVGN-fiWeo';

export default function App() {
  const [decoded] = useState<DecodedJwt | null>(() => {
    try {
      return decodeJwt(SAMPLE_TOKEN);
    } catch {
      return null;
    }
  });

  return <pre>{decoded ? JSON.stringify(decoded, null, 2) : 'decode failed'}</pre>;
}
