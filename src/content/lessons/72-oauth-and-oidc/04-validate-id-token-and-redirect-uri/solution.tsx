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
 * client's expectations.
 */
export function validateIdToken(
  claims: IdTokenClaims,
  options: ValidateIdTokenOptions,
): IdTokenValidationResult {
  const errors: string[] = [];
  const leeway = options.leewaySeconds ?? 0;

  if (claims.iss !== options.issuer) {
    errors.push('issuer mismatch');
  }

  const aud = claims.aud;
  const audList = Array.isArray(aud) ? aud : aud !== undefined ? [aud] : [];
  const audContainsClient = audList.includes(options.clientId);
  if (!audContainsClient) {
    errors.push('audience does not contain client_id');
  }

  if (audList.length > 1) {
    if (claims.azp === undefined) {
      errors.push('azp required when aud has multiple entries');
    } else if (claims.azp !== options.clientId) {
      errors.push('azp does not match client_id');
    }
  } else if (claims.azp !== undefined && claims.azp !== options.clientId) {
    errors.push('azp does not match client_id');
  }

  if (typeof claims.exp !== 'number') {
    errors.push('missing exp');
  } else if (options.now > claims.exp + leeway) {
    errors.push('expired');
  }

  if (claims.nonce !== options.nonce) {
    errors.push('nonce mismatch');
  }

  if (options.maxAgeSeconds !== undefined) {
    if (typeof claims.auth_time !== 'number') {
      errors.push('missing auth_time for max_age check');
    } else if (options.now - claims.auth_time > options.maxAgeSeconds + leeway) {
      errors.push('authentication too old for requested max_age');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Decides whether `actual` is an acceptable redirect for a client that
 * registered `registered`.
 */
export function redirectUriAllowed(registered: string, actual: string): boolean {
  if (registered === actual) return true;
  if (registered.includes('*') || actual.includes('*')) return false;

  let reg: URL;
  let act: URL;
  try {
    reg = new URL(registered);
    act = new URL(actual);
  } catch {
    return false;
  }

  const isLoopbackHost = (host: string) => host === '127.0.0.1' || host === '::1' || host === 'localhost';

  return (
    reg.protocol === act.protocol &&
    reg.hostname === act.hostname &&
    isLoopbackHost(reg.hostname) &&
    reg.pathname === act.pathname &&
    reg.search === act.search
  );
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
