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
  const largestChunks = stats.chunks
    .map((chunk) => ({
      name: chunk.name,
      size: chunk.modules.reduce((sum, m) => sum + m.size, 0),
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, topN);

  const chunksByModuleId = new Map<string, Set<string>>();
  for (const chunk of stats.chunks) {
    for (const mod of chunk.modules) {
      if (!chunksByModuleId.has(mod.id)) chunksByModuleId.set(mod.id, new Set());
      chunksByModuleId.get(mod.id)!.add(chunk.name);
    }
  }
  const sharedModules = [...chunksByModuleId.entries()]
    .filter(([, chunkNames]) => chunkNames.size > 1)
    .map(([id]) => id);

  const versionsByPackage = new Map<string, Set<string>>();
  for (const id of chunksByModuleId.keys()) {
    const match = id.match(PACKAGE_ID_RE);
    if (!match) continue;
    const [, name, version] = match;
    if (!versionsByPackage.has(name!)) versionsByPackage.set(name!, new Set());
    versionsByPackage.get(name!)!.add(version!);
  }
  const duplicatedPackages = [...versionsByPackage.entries()]
    .filter(([, versions]) => versions.size > 1)
    .map(([name, versions]) => ({ name, versions: [...versions] }));

  const gzipById = new Map<string, number>();
  for (const chunk of stats.chunks) {
    for (const mod of chunk.modules) {
      gzipById.set(mod.id, mod.gzipSize);
    }
  }
  const totalGzipEstimate = [...gzipById.values()].reduce((sum, g) => sum + g, 0);

  return { largestChunks, duplicatedPackages, sharedModules, totalGzipEstimate };
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
