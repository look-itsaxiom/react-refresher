import type { Check } from '../../../types';

type Snapshot = Record<string, string>;
type PackageMetadata = { hasInstallScript?: boolean; maintainerChanged?: boolean; publishedDaysAgo?: number };
type DiffFinding = { name: string; kind: string };
type ReviewFn = (before: Snapshot, after: Snapshot, metadata: Record<string, PackageMetadata>, recentDays: number) => DiffFinding[];
type PinFn = (lines: string[], tagToSha: Record<string, string>) => string[];

function pairs(findings: DiffFinding[]): string[] {
  return findings.map((f) => `${f.name}:${f.kind}`).sort();
}

export const checks: Check[] = [
  {
    name: 'flags a package missing from `after` as removed, regardless of metadata',
    run: async ({ mod, expect }) => {
      const reviewDependencyDiff = mod.reviewDependencyDiff as ReviewFn;
      const findings = reviewDependencyDiff({ debug: '4.3.4', react: '19.3.0' }, { react: '19.3.0' }, { debug: { maintainerChanged: true } }, 5);
      expect(pairs(findings)).to.include('debug:removed');
      expect(pairs(findings)).to.not.include('react:removed');
    },
  },
  {
    name: 'flags a new package as added, and never flags an untouched package',
    run: async ({ mod, expect }) => {
      const reviewDependencyDiff = mod.reviewDependencyDiff as ReviewFn;
      const findings = reviewDependencyDiff(
        { react: '19.2.0' },
        { react: '19.2.0', 'left-pad': '1.0.1' },
        { react: { maintainerChanged: true, hasInstallScript: true, publishedDaysAgo: 0 } },
        5,
      );
      expect(pairs(findings)).to.include('left-pad:added');
      expect(findings.some((f) => f.name === 'react')).to.equal(false);
    },
  },
  {
    name: 'a patch/minor bump is upgraded only; a major bump is upgraded AND major-bump',
    run: async ({ mod, expect }) => {
      const reviewDependencyDiff = mod.reviewDependencyDiff as ReviewFn;
      const findings = reviewDependencyDiff(
        { chalk: '5.3.0', debug: '4.3.4' },
        { chalk: '6.0.0', debug: '4.3.5' },
        {},
        5,
      );
      const p = pairs(findings);
      expect(p).to.include('chalk:upgraded');
      expect(p).to.include('chalk:major-bump');
      expect(p).to.include('debug:upgraded');
      expect(p).to.not.include('debug:major-bump');
    },
  },
  {
    name: 'surfaces new install scripts, maintainer changes, and recent publishes only for touched packages',
    run: async ({ mod, expect }) => {
      const reviewDependencyDiff = mod.reviewDependencyDiff as ReviewFn;
      const findings = reviewDependencyDiff(
        { react: '19.2.0' },
        { react: '19.2.0', 'left-pad': '1.0.1' },
        { 'left-pad': { hasInstallScript: true, maintainerChanged: true, publishedDaysAgo: 1 } },
        5,
      );
      const p = pairs(findings);
      expect(p).to.include('left-pad:new-install-script');
      expect(p).to.include('left-pad:maintainer-changed');
      expect(p).to.include('left-pad:recently-published');
    },
  },
  {
    name: 'a publishedDaysAgo at or above recentDays does not trigger recently-published',
    run: async ({ mod, expect }) => {
      const reviewDependencyDiff = mod.reviewDependencyDiff as ReviewFn;
      const findings = reviewDependencyDiff(
        {},
        { widget: '1.0.0' },
        { widget: { publishedDaysAgo: 10 } },
        5,
      );
      expect(pairs(findings)).to.not.include('widget:recently-published');
      expect(pairs(findings)).to.include('widget:added');
    },
  },
  {
    name: 'pinActions rewrites an unpinned tag to its SHA with the tag kept as a trailing comment',
    run: async ({ mod, expect }) => {
      const pinActions = mod.pinActions as PinFn;
      const result = pinActions(['      uses: actions/checkout@v4'], { 'actions/checkout@v4': 'a'.repeat(40) });
      expect(result[0]).to.equal(`      uses: actions/checkout@${'a'.repeat(40)} # v4`);
    },
  },
  {
    name: 'pinActions leaves an already-SHA-pinned line, an unknown tag, and a non-uses line untouched',
    run: async ({ mod, expect }) => {
      const pinActions = mod.pinActions as PinFn;
      const alreadyPinned = `      uses: actions/checkout@${'b'.repeat(40)}`;
      const unknownTag = '      uses: some/other-action@v9';
      const runLine = '      run: echo hi';
      const result = pinActions([alreadyPinned, unknownTag, runLine], { 'actions/checkout@v4': 'a'.repeat(40) });
      expect(result).to.deep.equal([alreadyPinned, unknownTag, runLine]);
    },
  },
];
