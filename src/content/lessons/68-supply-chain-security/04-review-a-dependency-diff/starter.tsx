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

// TODO: see prompt.md for the full rule set.
export function reviewDependencyDiff(
  before: Snapshot,
  after: Snapshot,
  metadata: Record<string, PackageMetadata>,
  recentDays: number,
): DiffFinding[] {
  return [];
}

// TODO: rewrite `uses: owner/repo@tag` lines to `uses: owner/repo@<sha> # tag`.
// Leave already-SHA-pinned lines and unmatched lines untouched.
export function pinActions(workflowYamlLines: string[], tagToSha: Record<string, string>): string[] {
  return workflowYamlLines;
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
