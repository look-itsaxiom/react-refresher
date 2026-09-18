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
 */
export function decodeJwt(token: string): DecodedJwt {
  const segments = token.split('.');
  if (segments.length !== 3) throw new Error('malformed token: expected 3 segments');

  const headerSegment = segments[0]!;
  const payloadSegment = segments[1]!;

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = JSON.parse(base64UrlDecode(headerSegment));
  } catch {
    throw new Error('malformed token: invalid header JSON');
  }
  try {
    payload = JSON.parse(base64UrlDecode(payloadSegment));
  } catch {
    throw new Error('malformed token: invalid payload JSON');
  }

  return { header, payload };
}

/**
 * Verifies an HS256-signed JWT against `secret`. Returns false for any
 * token that doesn't verify -- including one that isn't even HS256 -- and
 * never throws for a malformed or wrongly-signed token.
 */
export async function verifyHs256(token: string, secret: string): Promise<boolean> {
  const segments = token.split('.');
  if (segments.length !== 3) return false;
  const headerSegment = segments[0]!;
  const payloadSegment = segments[1]!;
  const signatureSegment = segments[2]!;

  let header: JwtHeader;
  try {
    header = JSON.parse(base64UrlDecode(headerSegment));
  } catch {
    return false;
  }
  if (header.alg !== 'HS256') return false;

  const signingInput = `${headerSegment}.${payloadSegment}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const expected = base64UrlEncodeBytes(new Uint8Array(signature));

  return expected === signatureSegment;
}

/**
 * Validates claims on an already-decoded payload. Call this only after
 * `verifyHs256` has returned true -- this function trusts its input.
 */
export function validateClaims(payload: JwtPayload, options: ClaimsValidationOptions): ClaimsValidationResult {
  const leeway = options.leewaySeconds ?? 0;
  const errors: string[] = [];

  if (typeof payload.exp === 'number' && options.now > payload.exp + leeway) {
    errors.push('expired');
  }
  if (typeof payload.nbf === 'number' && options.now < payload.nbf - leeway) {
    errors.push('not yet valid');
  }
  if (options.issuer !== undefined && payload.iss !== options.issuer) {
    errors.push('issuer mismatch');
  }
  if (options.audience !== undefined) {
    const aud = payload.aud;
    const matches = Array.isArray(aud) ? aud.includes(options.audience) : aud === options.audience;
    if (!matches) errors.push('audience mismatch');
  }

  return { ok: errors.length === 0, errors };
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
