import type { Check } from '../../../types';

type Finding = { severity: 'high' | 'medium' | 'low'; package: string; kind: string; message: string };
type PackageEntry = {
  name: string;
  version: string;
  publishedAt: string;
  integrity?: string;
  hasInstallScript: boolean;
  provenance?: boolean;
  resolvedRegistry: string;
};
type Lockfile = { packages: PackageEntry[] };
type Policy = {
  minimumReleaseAgeDays: number;
  allowedRegistries: string[];
  allowInstallScripts: string[];
  requireIntegrity: boolean;
  requireProvenanceFor: string[];
};
type AuditFn = (lock: Lockfile, policy: Policy, now: string) => Finding[];
type TyposquatFn = (names: string[], popular: string[]) => string[];

function keys(findings: Finding[]): string[] {
  return findings.map((f) => `${f.kind}:${f.package}`).sort();
}

const basePolicy: Policy = {
  minimumReleaseAgeDays: 3,
  allowedRegistries: ['https://registry.npmjs.org'],
  allowInstallScripts: ['sharp'],
  requireIntegrity: true,
  requireProvenanceFor: ['left-pad'],
};

export const checks: Check[] = [
  {
    name: 'flags a package published inside the minimum release age window as too-new',
    run: async ({ mod, expect }) => {
      const auditLockfile = mod.auditLockfile as AuditFn;
      const lock: Lockfile = {
        packages: [
          {
            name: 'left-pad',
            version: '1.0.0',
            publishedAt: '2026-09-17',
            hasInstallScript: false,
            integrity: 'sha512-x',
            provenance: true,
            resolvedRegistry: 'https://registry.npmjs.org',
          },
        ],
      };
      const findings = auditLockfile(lock, basePolicy, '2026-09-18');
      const tooNew = findings.find((f) => f.kind === 'too-new' && f.package === 'left-pad');
      expect(tooNew, 'expected a too-new finding').to.exist;
      expect(tooNew!.severity).to.equal('high');
    },
  },
  {
    name: 'flags an install script that is not allowlisted, but not one that is',
    run: async ({ mod, expect }) => {
      const auditLockfile = mod.auditLockfile as AuditFn;
      const lock: Lockfile = {
        packages: [
          { name: 'sharp', version: '0.33.0', publishedAt: '2020-01-01', hasInstallScript: true, integrity: 'sha512-x', resolvedRegistry: 'https://registry.npmjs.org' },
          { name: 'evil-pkg', version: '1.0.0', publishedAt: '2020-01-01', hasInstallScript: true, integrity: 'sha512-x', resolvedRegistry: 'https://registry.npmjs.org' },
        ],
      };
      const findings = auditLockfile(lock, basePolicy, '2026-09-18');
      expect(findings.some((f) => f.kind === 'unallowed-install-script' && f.package === 'evil-pkg')).to.equal(true);
      expect(findings.some((f) => f.kind === 'unallowed-install-script' && f.package === 'sharp')).to.equal(false);
    },
  },
  {
    name: 'flags missing integrity and missing provenance independently of other rules',
    run: async ({ mod, expect }) => {
      const auditLockfile = mod.auditLockfile as AuditFn;
      const lock: Lockfile = {
        packages: [
          { name: 'left-pad', version: '1.0.0', publishedAt: '2020-01-01', hasInstallScript: false, resolvedRegistry: 'https://registry.npmjs.org' },
        ],
      };
      const findings = auditLockfile(lock, basePolicy, '2026-09-18');
      const kindsFound = keys(findings);
      expect(kindsFound).to.include('missing-integrity:left-pad');
      expect(kindsFound).to.include('missing-provenance:left-pad');
      expect(kindsFound).to.not.include('too-new:left-pad');
    },
  },
  {
    name: 'flags a package resolved from a registry outside the allowed list',
    run: async ({ mod, expect }) => {
      const auditLockfile = mod.auditLockfile as AuditFn;
      const lock: Lockfile = {
        packages: [
          {
            name: '@yourco/utils',
            version: '1.0.0',
            publishedAt: '2020-01-01',
            hasInstallScript: false,
            integrity: 'sha512-x',
            resolvedRegistry: 'https://some-other-registry.example',
          },
        ],
      };
      const findings = auditLockfile(lock, basePolicy, '2026-09-18');
      const finding = findings.find((f) => f.kind === 'unexpected-registry');
      expect(finding, 'expected an unexpected-registry finding').to.exist;
      expect(finding!.severity).to.equal('high');
    },
  },
  {
    name: 'flags a package name appearing at more than one version exactly once, not once per entry',
    run: async ({ mod, expect }) => {
      const auditLockfile = mod.auditLockfile as AuditFn;
      const lock: Lockfile = {
        packages: [
          { name: 'lodash', version: '4.17.20', publishedAt: '2020-01-01', hasInstallScript: false, integrity: 'sha512-x', provenance: true, resolvedRegistry: 'https://registry.npmjs.org' },
          { name: 'lodash', version: '4.17.21', publishedAt: '2020-01-01', hasInstallScript: false, integrity: 'sha512-x', provenance: true, resolvedRegistry: 'https://registry.npmjs.org' },
          { name: 'lodash', version: '4.17.19', publishedAt: '2020-01-01', hasInstallScript: false, integrity: 'sha512-x', provenance: true, resolvedRegistry: 'https://registry.npmjs.org' },
        ],
      };
      const findings = auditLockfile(lock, basePolicy, '2026-09-18');
      const dupes = findings.filter((f) => f.kind === 'duplicate-version' && f.package === 'lodash');
      expect(dupes.length).to.equal(1);
      expect(dupes[0]?.severity).to.equal('low');
    },
  },
  {
    name: 'a clean package against a satisfied policy produces no findings',
    run: async ({ mod, expect }) => {
      const auditLockfile = mod.auditLockfile as AuditFn;
      const lock: Lockfile = {
        packages: [
          { name: 'sharp', version: '0.33.0', publishedAt: '2020-01-01', hasInstallScript: true, integrity: 'sha512-x', resolvedRegistry: 'https://registry.npmjs.org' },
        ],
      };
      expect(auditLockfile(lock, basePolicy, '2026-09-18')).to.have.length(0);
    },
  },
  {
    name: 'typosquatSuspects flags names within edit distance 1-2 of a popular name, excluding exact matches',
    run: async ({ mod, expect }) => {
      const typosquatSuspects = mod.typosquatSuspects as TyposquatFn;
      const result = typosquatSuspects(['raect', 'react', 'lodahs', 'unrelated-thing', 'expresss'], ['react', 'lodash', 'express']);
      expect(result).to.include('raect');
      expect(result).to.include('lodahs');
      expect(result).to.include('expresss');
      expect(result).to.not.include('react');
      expect(result).to.not.include('unrelated-thing');
    },
  },
  {
    name: 'typosquatSuspects preserves input order and returns no duplicates',
    run: async ({ mod, expect }) => {
      const typosquatSuspects = mod.typosquatSuspects as TyposquatFn;
      const result = typosquatSuspects(['lodahs', 'raect', 'lodahs'], ['react', 'lodash']);
      expect(result).to.deep.equal(['lodahs', 'raect']);
    },
  },
];
