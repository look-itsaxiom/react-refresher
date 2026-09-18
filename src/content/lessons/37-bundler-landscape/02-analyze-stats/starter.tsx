export type StatsModule = { id: string; size: number; gzipSize: number };
export type StatsChunk = { name: string; modules: StatsModule[]; dynamicImports?: string[] };
export type Stats = { chunks: StatsChunk[] };

export type StatsReport = {
  // Chunk names sorted by total size (sum of its modules' `size`), descending, capped at `topN`.
  largestChunks: Array<{ name: string; size: number }>;
  // Packages found under `node_modules/<pkg>@<version>/...` in more than one version.
  duplicatedPackages: Array<{ name: string; versions: string[] }>;
  // Module ids that appear in the `modules` array of more than one chunk.
  sharedModules: string[];
  // Sum of `gzipSize` across every *distinct* module id in the whole stats object
  // (a module duplicated into two chunks is still counted once here).
  totalGzipEstimate: number;
};

// Matches a module id produced by a package manager for a dependency, e.g.
// 'node_modules/lodash@4.17.21/lodash.js' or 'node_modules/@scope/pkg@1.2.0/index.js'.
// Capture group 1 is the package name (including scope), group 2 is the version.
const PACKAGE_ID_RE = /^node_modules\/((?:@[^/]+\/)?[^/@]+)@([^/]+)\//;

export function analyzeStats(stats: Stats, topN: number): StatsReport {
  // TODO 1: largestChunks — for each chunk, sum its modules' `size`, sort chunks by
  // that total descending, and take the first `topN` as { name, size }.

  // TODO 2: sharedModules — build a map of module id -> Set<chunk name> by walking
  // every chunk's `modules`. A module id whose set has more than one chunk name goes
  // into the result (each id listed once).

  // TODO 3: duplicatedPackages — for every module id across every chunk, match it
  // against PACKAGE_ID_RE. Group the matched versions by package name (a Set, so the
  // same version seen twice doesn't count twice). A package name whose set of
  // versions has more than one entry goes into the result as { name, versions }
  // (versions can be in any order).

  // TODO 4: totalGzipEstimate — walk every module id across every chunk exactly once
  // (dedupe by id — the same id may appear in two chunks with the same size/gzipSize)
  // and sum its `gzipSize`.

  return {
    largestChunks: [],
    duplicatedPackages: [],
    sharedModules: [],
    totalGzipEstimate: 0,
  };
}

const sampleStats: Stats = {
  chunks: [
    {
      name: 'home',
      modules: [
        { id: 'src/pages/Home.tsx', size: 2400, gzipSize: 900 },
        { id: 'node_modules/lodash@4.17.21/lodash.js', size: 71000, gzipSize: 25000 },
        { id: 'node_modules/date-fns@3.6.0/index.js', size: 18000, gzipSize: 6000 },
      ],
      dynamicImports: ['settings'],
    },
    {
      name: 'settings',
      modules: [
        { id: 'src/pages/Settings.tsx', size: 3100, gzipSize: 1100 },
        // Duplicated because it wasn't extracted into a shared chunk.
        { id: 'node_modules/lodash@4.17.21/lodash.js', size: 71000, gzipSize: 25000 },
        { id: 'node_modules/date-fns@2.30.0/index.js', size: 16000, gzipSize: 5400 },
      ],
    },
  ],
};

function StatsReportView({ report }: { report: StatsReport }) {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Largest chunks</h2>
      <ul>
        {report.largestChunks.map((c) => (
          <li key={c.name}>{c.name}: {c.size}</li>
        ))}
      </ul>
      <h2>Duplicated packages</h2>
      <ul>
        {report.duplicatedPackages.map((p) => (
          <li key={p.name}>{p.name}: {p.versions.join(', ')}</li>
        ))}
      </ul>
      <h2>Shared modules</h2>
      <ul>
        {report.sharedModules.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
      <p>Total gzip estimate: {report.totalGzipEstimate}</p>
    </div>
  );
}

export default function App() {
  const report = analyzeStats(sampleStats, 1);
  return <StatsReportView report={report} />;
}
