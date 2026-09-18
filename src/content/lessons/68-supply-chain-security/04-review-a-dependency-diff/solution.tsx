export type Snapshot = Record<string, string>;

export type PackageMetadata = {
  hasInstallScript?: boolean;
  maintainerChanged?: boolean;
  publishedDaysAgo?: number;
};

export type DiffKind =
  | 'added'
  | 'removed'
  | 'upgraded'
  | 'major-bump'
  | 'new-install-script'
  | 'maintainer-changed'
  | 'recently-published';

export type DiffFinding = { name: string; kind: DiffKind };

function majorOf(version: string): string {
  return version.split('.')[0] ?? version;
}

export function reviewDependencyDiff(
  before: Snapshot,
  after: Snapshot,
  metadata: Record<string, PackageMetadata>,
  recentDays: number,
): DiffFinding[] {
  const findings: DiffFinding[] = [];

  for (const name of Object.keys(before)) {
    if (!(name in after)) {
      findings.push({ name, kind: 'removed' });
    }
  }

  for (const name of Object.keys(after)) {
    const wasPresent = name in before;
    const versionChanged = wasPresent && before[name] !== after[name];
    const touched = !wasPresent || versionChanged;
    if (!touched) continue;

    if (!wasPresent) {
      findings.push({ name, kind: 'added' });
    } else {
      findings.push({ name, kind: 'upgraded' });
      if (majorOf(after[name]!) !== majorOf(before[name]!)) {
        findings.push({ name, kind: 'major-bump' });
      }
    }

    const meta = metadata[name];
    if (meta?.hasInstallScript) {
      findings.push({ name, kind: 'new-install-script' });
    }
    if (meta?.maintainerChanged) {
      findings.push({ name, kind: 'maintainer-changed' });
    }
    if (meta?.publishedDaysAgo !== undefined && meta.publishedDaysAgo < recentDays) {
      findings.push({ name, kind: 'recently-published' });
    }
  }

  return findings;
}

const usesLineRe = /^(\s*uses:\s*)([\w.-]+\/[\w.-]+)@([^\s#]+)(.*)$/;
const shaRe = /^[0-9a-f]{40}$/i;

export function pinActions(workflowYamlLines: string[], tagToSha: Record<string, string>): string[] {
  return workflowYamlLines.map((line) => {
    const match = line.match(usesLineRe);
    if (!match) return line;
    const prefix = match[1]!;
    const ownerRepo = match[2]!;
    const ref = match[3]!;
    if (shaRe.test(ref)) return line;
    const sha = tagToSha[`${ownerRepo}@${ref}`];
    if (!sha) return line;
    return `${prefix}${ownerRepo}@${sha} # ${ref}`;
  });
}

const demoBefore: Snapshot = { react: '19.2.0', debug: '4.3.4', chalk: '5.3.0' };
const demoAfter: Snapshot = { react: '19.3.0', chalk: '6.0.0', 'left-pad': '1.0.1' };
const demoMetadata: Record<string, PackageMetadata> = {
  chalk: { maintainerChanged: true, publishedDaysAgo: 2 },
  'left-pad': { hasInstallScript: true, publishedDaysAgo: 12 },
};

const demoWorkflow = [
  '      uses: actions/checkout@v4',
  '      uses: actions/setup-node@v4',
  '      uses: tj-actions/changed-files@0123456789abcdef0123456789abcdef01234567',
  '      run: echo hi',
];
const demoTagToSha: Record<string, string> = {
  'actions/checkout@v4': 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
};

export default function App() {
  const findings = reviewDependencyDiff(demoBefore, demoAfter, demoMetadata, 5);
  const pinned = pinActions(demoWorkflow, demoTagToSha);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Dependency diff</h2>
      <ul>
        {findings.map((f, i) => (
          <li key={i}>
            {f.name}: {f.kind}
          </li>
        ))}
      </ul>
      <h2>Pinned workflow</h2>
      <pre>{pinned.join('\n')}</pre>
    </div>
  );
}
