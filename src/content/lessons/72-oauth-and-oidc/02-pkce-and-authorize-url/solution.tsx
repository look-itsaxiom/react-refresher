import { useState } from 'react';

export type AuthorizeParams = {
  issuerAuthorizeEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  nonce: string;
  challenge: string;
};

export type CallbackValidation = { ok: true; code: string } | { ok: false; error: string };

/** Base64url-encodes raw bytes (no padding, URL-safe alphabet). */
function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The RFC 3986 "unreserved" characters -- the only ones a PKCE verifier may contain. */
const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Generates a PKCE code_verifier: `length` characters (43-128 per RFC 7636),
 * drawn from the unreserved character set, using `randomSource` for bytes.
 */
export function generateVerifier(
  length = 64,
  randomSource: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> = (bytes) => crypto.getRandomValues(bytes),
): string {
  if (length < 43 || length > 128) {
    throw new Error('code_verifier length must be between 43 and 128 characters');
  }
  const bytes = randomSource(new Uint8Array(length));
  let verifier = '';
  for (let i = 0; i < length; i++) {
    verifier += UNRESERVED[bytes[i]! % UNRESERVED.length];
  }
  return verifier;
}

/**
 * Derives a PKCE code_challenge from a code_verifier:
 * base64url(SHA-256(ASCII bytes of verifier)).
 */
export async function codeChallenge(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return base64UrlEncodeBytes(new Uint8Array(digest));
}

/**
 * Builds the URL to redirect the browser to for an authorization code +
 * PKCE + OIDC request.
 */
export function buildAuthorizeUrl(params: AuthorizeParams): string {
  const url = new URL(params.issuerAuthorizeEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/**
 * Validates an authorization-server callback URL before exchanging
 * anything. Order matters -- state is checked first (it binds the
 * response to a request this client made, so nothing else is trustworthy
 * until it matches), then the issuer (RFC 9207 mix-up defense, only when
 * the AS included one), then whether the AS reported an error, then
 * whether a code is actually present.
 */
export function validateCallback(
  callbackUrl: string,
  options: { expectedState: string; expectedIssuer?: string },
): CallbackValidation {
  const params = new URL(callbackUrl).searchParams;

  if (params.get('state') !== options.expectedState) {
    return { ok: false, error: 'state_mismatch' };
  }

  const iss = params.get('iss');
  if (options.expectedIssuer !== undefined && iss !== null && iss !== options.expectedIssuer) {
    return { ok: false, error: 'issuer_mismatch' };
  }

  const error = params.get('error');
  if (error !== null) {
    return { ok: false, error };
  }

  const code = params.get('code');
  if (code === null) {
    return { ok: false, error: 'missing_code' };
  }

  return { ok: true, code };
}

export default function App() {
  const [verifier] = useState(() => {
    try {
      return generateVerifier();
    } catch {
      return null;
    }
  });

  return <pre>{verifier ? `code_verifier: ${verifier}` : 'generateVerifier not implemented yet'}</pre>;
}
