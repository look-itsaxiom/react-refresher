import { useEffect, useState } from 'react';

export type Algorithm = 'sha256' | 'sha384' | 'sha512';

const ALGO_NAME: Record<Algorithm, string> = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' };
const STRENGTH: Record<Algorithm, number> = { sha256: 1, sha384: 2, sha512: 3 };

/** Hashes `content` and base64-encodes the raw digest bytes. */
async function digestBase64(content: string, algoName: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest(algoName, data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Computes an SRI value (`sha384-...`) for `content`.
 */
export async function sriIntegrity(content: string, algorithm: Algorithm = 'sha384'): Promise<string> {
  // BUG: base64-encodes the raw content string directly, and never hashes
  // it at all. This needs to call digestBase64(content, ALGO_NAME[algorithm])
  // and base64-encode THAT, not `content` itself.
  return `${algorithm}-${btoa(content)}`;
}

/**
 * Verifies `content` against a real `integrity` attribute value, which may
 * list several space-separated hashes across different algorithms. Per the
 * SRI spec, only the strongest algorithm present should be checked.
 */
export async function verifyIntegrity(content: string, integrityAttr: string): Promise<boolean> {
  const tokens = integrityAttr.trim().split(/\s+/).filter(Boolean);
  const parsed = tokens
    .map((token) => {
      const dashIndex = token.indexOf('-');
      if (dashIndex === -1) return null;
      const algorithm = token.slice(0, dashIndex) as Algorithm;
      const hash = token.slice(dashIndex + 1);
      return ALGO_NAME[algorithm] ? { algorithm, hash } : null;
    })
    .filter((p): p is { algorithm: Algorithm; hash: string } => p !== null);

  if (parsed.length === 0) return false;

  // BUG: uses whichever algorithm the first listed hash happens to use,
  // instead of the strongest algorithm present among ALL tokens. An
  // attacker who adds a weak, forgeable hash before a strong correct one
  // should not be able to force verification down to the weak algorithm.
  const chosen = parsed[0]!;
  const candidates = parsed.filter((p) => p.algorithm === chosen.algorithm).map((p) => p.hash);
  const actual = await digestBase64(content, ALGO_NAME[chosen.algorithm]);
  return candidates.includes(actual);
}

/** Builds a <script> tag string with the integrity and crossorigin attributes set. */
export async function scriptTagFor(url: string, content: string): Promise<string> {
  const integrity = await sriIntegrity(content);
  return `<script src="${url}" integrity="${integrity}" crossorigin="anonymous"></script>`;
}

export default function App() {
  const [tag, setTag] = useState('computing…');

  useEffect(() => {
    let active = true;
    scriptTagFor('https://cdn.example.com/lib.js', 'console.log(1);').then((result) => {
      if (active) setTag(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return <pre>{tag}</pre>;
}
