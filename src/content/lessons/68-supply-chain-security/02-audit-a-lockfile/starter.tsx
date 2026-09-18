export type PackageEntry = {
  name: string;
  version: string;
  publishedAt: string; // ISO date
  integrity?: string;
  hasInstallScript: boolean;
  provenance?: boolean;
  resolvedRegistry: string;
};

export type Lockfile = { packages: PackageEntry[] };

export type Policy = {
  minimumReleaseAgeDays: number;
  allowedRegistries: string[];
  allowInstallScripts: string[];
  requireIntegrity: boolean;
  requireProvenanceFor: string[];
};

export type Severity = 'high' | 'medium' | 'low';
export type Finding = { severity: Severity; package: string; kind: string; message: string };

/** Whole days between two ISO date strings (now - publishedAt). Already written. */
export function daysBetween(now: string, publishedAt: string): number {
  const ms = new Date(now).getTime() - new Date(publishedAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Classic edit-distance. Already written — not the point of this exercise. */
export function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) d[0]![j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      d[i]![j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1]![j - 1]!
          : 1 + Math.min(d[i - 1]![j]!, d[i]![j - 1]!, d[i - 1]![j - 1]!);
    }
  }
  return d[rows - 1]![cols - 1]!;
}

// TODO: audit a lockfile against a policy. See prompt.md for the five per-package
// rules plus the once-per-name duplicate-version rule.
export function auditLockfile(lock: Lockfile, policy: Policy, now: string): Finding[] {
  return [];
}

// TODO: flag names within Levenshtein distance 1-2 of a popular name, excluding exact
// matches, preserving input order, no duplicates.
export function typosquatSuspects(names: string[], popular: string[]): string[] {
  return [];
}

const demoLockfile: Lockfile = {
  packages: [
    { name: 'left-pad', version: '1.3.0', publishedAt: '2026-09-17', hasInstallScript: false, resolvedRegistry: 'https://registry.npmjs.org' },
    { name: 'left-pad', version: '1.2.0', publishedAt: '2024-01-01', hasInstallScript: false, resolvedRegistry: 'https://registry.npmjs.org' },
    { name: 'bcrypt', version: '5.1.1', publishedAt: '2025-01-01', hasInstallScript: true, provenance: true, integrity: 'sha512-abc', resolvedRegistry: 'https://registry.npmjs.org' },
    { name: '@yourco/utils', version: '2.0.0', publishedAt: '2025-06-01', hasInstallScript: false, integrity: 'sha512-def', resolvedRegistry: 'https://registry.npmjs.org' },
  ],
};

const demoPolicy: Policy = {
  minimumReleaseAgeDays: 1,
  allowedRegistries: ['https://registry.npmjs.org', 'https://npm.internal.yourco.com'],
  allowInstallScripts: ['bcrypt'],
  requireIntegrity: true,
  requireProvenanceFor: ['bcrypt'],
};

export default function App() {
  const findings = auditLockfile(demoLockfile, demoPolicy, '2026-09-18');
  const suspects = typosquatSuspects(['raect', 'lodahs', 'express', 'react'], ['react', 'express', 'lodash']);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Lockfile audit</h2>
      <ul>
        {findings.map((f, i) => (
          <li key={i}>
            [{f.severity}] {f.package}: {f.kind}
          </li>
        ))}
      </ul>
      <h2>Typosquat suspects</h2>
      <p>{suspects.join(', ') || '—'}</p>
    </div>
  );
}
