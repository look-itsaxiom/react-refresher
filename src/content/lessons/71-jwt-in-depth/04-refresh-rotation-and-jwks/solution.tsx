import { useState } from 'react';

export type RotateResult = { refreshToken: string; familyId: string } | { error: 'invalid' | 'reuse-detected' };

export type RefreshRotation = {
  issue(userId: string): { refreshToken: string; familyId: string };
  rotate(refreshToken: string): RotateResult;
  revokeFamily(familyId: string): void;
  isValid(refreshToken: string): boolean;
};

export type RefreshRotationOptions = {
  clock: () => number;
  idFactory: () => string;
  ttlMs?: number;
};

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type TokenRecord = {
  familyId: string;
  userId: string;
  usedAt: number | null;
  expiresAt: number;
};

export function createRefreshRotation(options: RefreshRotationOptions): RefreshRotation {
  const { clock, idFactory } = options;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  const tokens = new Map<string, TokenRecord>();
  const revokedFamilies = new Set<string>();

  function revokeFamily(familyId: string): void {
    revokedFamilies.add(familyId);
  }

  function isValid(refreshToken: string): boolean {
    const record = tokens.get(refreshToken);
    if (!record) return false;
    if (revokedFamilies.has(record.familyId)) return false;
    if (record.usedAt !== null) return false;
    if (clock() >= record.expiresAt) return false;
    return true;
  }

  function issue(userId: string): { refreshToken: string; familyId: string } {
    const refreshToken = idFactory();
    const familyId = idFactory();
    tokens.set(refreshToken, {
      familyId,
      userId,
      usedAt: null,
      expiresAt: clock() + ttlMs,
    });
    return { refreshToken, familyId };
  }

  function rotate(refreshToken: string): RotateResult {
    const record = tokens.get(refreshToken);
    if (!record || revokedFamilies.has(record.familyId)) {
      return { error: 'invalid' };
    }
    if (record.usedAt !== null) {
      revokeFamily(record.familyId);
      return { error: 'reuse-detected' };
    }
    if (clock() >= record.expiresAt) {
      return { error: 'invalid' };
    }

    record.usedAt = clock();

    const newToken = idFactory();
    tokens.set(newToken, {
      familyId: record.familyId,
      userId: record.userId,
      usedAt: null,
      expiresAt: clock() + ttlMs,
    });

    return { refreshToken: newToken, familyId: record.familyId };
  }

  return { issue, rotate, revokeFamily, isValid };
}

export type Jwk = { kid: string; alg?: string; use?: string; [key: string]: unknown };
export type Jwks = { keys: Jwk[] };
export type JwtHeaderForKeySelection = { kid?: string; alg: string };

export function jwksSelectKey(jwks: Jwks, header: JwtHeaderForKeySelection): Jwk {
  if (!header.kid) throw new Error('token has no kid; cannot select a key');

  const key = jwks.keys.find((k) => k.kid === header.kid);
  if (!key) throw new Error(`no key found for kid: ${header.kid}`);

  if (key.alg && key.alg !== header.alg) {
    throw new Error(`key ${key.kid} is for alg ${key.alg}, not ${header.alg}`);
  }
  if (key.use && key.use !== 'sig') {
    throw new Error(`key ${key.kid} is not a signing key (use: ${key.use})`);
  }

  return key;
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
