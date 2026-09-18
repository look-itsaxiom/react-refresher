import { useState } from 'react';

export type RotateResult = { refreshToken: string; familyId: string } | { error: 'invalid' | 'reuse-detected' };

export type RefreshRotation = {
  /** Issues a brand-new refresh token, starting a new token family. */
  issue(userId: string): { refreshToken: string; familyId: string };
  /**
   * Exchanges a refresh token for a new one in the same family. If
   * `refreshToken` was already used once before, this is reuse -- the
   * whole family is revoked and `{ error: 'reuse-detected' }` is returned.
   * An unknown token returns `{ error: 'invalid' }`.
   */
  rotate(refreshToken: string): RotateResult;
  /** Revokes every token in a family, regardless of whether it was used. */
  revokeFamily(familyId: string): void;
  /** True only for a token that exists, is unused, unexpired, and whose family isn't revoked. */
  isValid(refreshToken: string): boolean;
};

export type RefreshRotationOptions = {
  /** Returns the current time in milliseconds, like `Date.now()`. */
  clock: () => number;
  /** Returns a fresh unique id on every call. */
  idFactory: () => string;
  /** How long a refresh token stays valid after issuance. Defaults to 30 days. */
  ttlMs?: number;
};

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * TODO: implement.
 * - Keep an in-memory Map of token -> { familyId, usedAt, expiresAt } and a
 *   Set of revoked family ids.
 * - issue(userId): mint a token id and a family id via idFactory(); store a
 *   fresh record (usedAt: null, expiresAt: clock() + ttlMs); return both ids.
 * - rotate(refreshToken): look up the record.
 *     - missing, or its family is revoked -> { error: 'invalid' }
 *     - already used (usedAt !== null) -> revoke the WHOLE family via
 *       revokeFamily, then { error: 'reuse-detected' }
 *     - expired (clock() >= expiresAt) -> { error: 'invalid' }
 *     - otherwise: mark it used (usedAt = clock()), mint a new token in the
 *       SAME family, return { refreshToken: newToken, familyId }
 * - revokeFamily(familyId): add it to the revoked set.
 * - isValid(refreshToken): true only if the token exists, is unused, is
 *   unexpired, and its family is not revoked.
 */
export function createRefreshRotation(options: RefreshRotationOptions): RefreshRotation {
  throw new Error('not implemented');
}

export type Jwk = { kid: string; alg?: string; use?: string; [key: string]: unknown };
export type Jwks = { keys: Jwk[] };
export type JwtHeaderForKeySelection = { kid?: string; alg: string };

/**
 * TODO: implement.
 * Picks the key from `jwks.keys` whose `kid` matches `header.kid`.
 * - No `kid` on the header, or no key with that `kid` in the set -> throw.
 *   Never fall back to "the first key" -- an unrecognized kid must fail
 *   closed, not silently pick something else.
 * - If the matched key has an `alg` field and it doesn't equal
 *   `header.alg` -> throw (this is what stops an RS256-key-used-as-HS256
 *   confusion attack: the key says what algorithm it's for).
 * - If the matched key has a `use` field and it isn't `'sig'` -> throw
 *   (don't use an encryption key to verify a signature).
 * - Otherwise return the matched key.
 */
export function jwksSelectKey(jwks: Jwks, header: JwtHeaderForKeySelection): Jwk {
  throw new Error('not implemented');
}

export default function App() {
  const [log] = useState<string[]>(() => {
    try {
      const rotation = createRefreshRotation({ clock: () => Date.now(), idFactory: () => Math.random().toString(36).slice(2) });
      const { refreshToken, familyId } = rotation.issue('user-1');
      return [`issued token in family ${familyId}`, `valid: ${rotation.isValid(refreshToken)}`];
    } catch (err) {
      return [`error: ${(err as Error).message}`];
    }
  });

  return (
    <ul>
      {log.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}
