import type { Check } from '../../../types';

type StatsModule = { id: string; size: number; gzipSize: number };
type StatsChunk = { name: string; modules: StatsModule[]; dynamicImports?: string[] };
type Stats = { chunks: StatsChunk[] };
type StatsReport = {
  largestChunks: Array<{ name: string; size: number }>;
  duplicatedPackages: Array<{ name: string; versions: string[] }>;
  sharedModules: string[];
  totalGzipEstimate: number;
};

export const checks: Check[] = [
  {
    name: 'largestChunks: chunks are ranked by total module size, descending, capped at topN',
    run: async ({ mod, expect }) => {
      const analyzeStats = mod.analyzeStats as (stats: Stats, topN: number) => StatsReport;
      const stats: Stats = {
        chunks: [
          { name: 'small', modules: [{ id: 'a.js', size: 100, gzipSize: 50 }] },
          {
            name: 'big',
            modules: [
              { id: 'b.js', size: 5000, gzipSize: 2000 },
              { id: 'c.js', size: 5000, gzipSize: 2000 },
            ],
          },
          { name: 'medium', modules: [{ id: 'd.js', size: 1000, gzipSize: 400 }] },
        ],
      };

      const report = analyzeStats(stats, 2);
      expect(report.largestChunks).to.have.lengthOf(2);
      expect(report.largestChunks[0]).to.deep.equal({ name: 'big', size: 10000 });
      expect(report.largestChunks[1]).to.deep.equal({ name: 'medium', size: 1000 });
    },
  },
  {
    name: 'sharedModules: a module id present in two chunks is reported once; one present in only one chunk is not reported',
    run: async ({ mod, expect }) => {
      const analyzeStats = mod.analyzeStats as (stats: Stats, topN: number) => StatsReport;
      const stats: Stats = {
        chunks: [
          {
            name: 'home',
            modules: [
              { id: 'src/Home.tsx', size: 100, gzipSize: 40 },
              { id: 'node_modules/lodash@4.17.21/index.js', size: 7000, gzipSize: 2500 },
            ],
          },
          {
            name: 'settings',
            modules: [
              { id: 'src/Settings.tsx', size: 100, gzipSize: 40 },
              { id: 'node_modules/lodash@4.17.21/index.js', size: 7000, gzipSize: 2500 },
            ],
          },
        ],
      };

      const report = analyzeStats(stats, 5);
      expect(report.sharedModules).to.deep.equal(['node_modules/lodash@4.17.21/index.js']);
    },
  },
  {
    name: 'duplicatedPackages: two versions of the same package across chunks are flagged; a repeated identical version is not',
    run: async ({ mod, expect }) => {
      const analyzeStats = mod.analyzeStats as (stats: Stats, topN: number) => StatsReport;
      const stats: Stats = {
        chunks: [
          {
            name: 'home',
            modules: [
              { id: 'node_modules/date-fns@3.6.0/index.js', size: 100, gzipSize: 40 },
              { id: 'node_modules/lodash@4.17.21/index.js', size: 7000, gzipSize: 2500 },
              { id: 'src/local.ts', size: 10, gzipSize: 5 },
            ],
          },
          {
            name: 'settings',
            modules: [
              { id: 'node_modules/date-fns@2.30.0/index.js', size: 90, gzipSize: 35 },
              // same lodash version again -- not a duplicate
              { id: 'node_modules/lodash@4.17.21/index.js', size: 7000, gzipSize: 2500 },
            ],
          },
        ],
      };

      const report = analyzeStats(stats, 5);
      expect(report.duplicatedPackages).to.have.lengthOf(1);
      expect(report.duplicatedPackages[0]!.name).to.equal('date-fns');
      expect(report.duplicatedPackages[0]!.versions.slice().sort()).to.deep.equal(['2.30.0', '3.6.0']);
    },
  },
  {
    name: 'duplicatedPackages: a scoped package is matched by name including its scope',
    run: async ({ mod, expect }) => {
      const analyzeStats = mod.analyzeStats as (stats: Stats, topN: number) => StatsReport;
      const stats: Stats = {
        chunks: [
          { name: 'a', modules: [{ id: 'node_modules/@scope/pkg@1.0.0/index.js', size: 10, gzipSize: 5 }] },
          { name: 'b', modules: [{ id: 'node_modules/@scope/pkg@2.0.0/index.js', size: 10, gzipSize: 5 }] },
        ],
      };

      const report = analyzeStats(stats, 5);
      expect(report.duplicatedPackages).to.have.lengthOf(1);
      expect(report.duplicatedPackages[0]!.name).to.equal('@scope/pkg');
    },
  },
  {
    name: 'totalGzipEstimate: a module duplicated verbatim across chunks is counted once, not once per chunk',
    run: async ({ mod, expect }) => {
      const analyzeStats = mod.analyzeStats as (stats: Stats, topN: number) => StatsReport;
      const stats: Stats = {
        chunks: [
          {
            name: 'home',
            modules: [
              { id: 'src/Home.tsx', size: 100, gzipSize: 40 },
              { id: 'node_modules/lodash@4.17.21/index.js', size: 7000, gzipSize: 2500 },
            ],
          },
          {
            name: 'settings',
            modules: [
              { id: 'src/Settings.tsx', size: 100, gzipSize: 30 },
              { id: 'node_modules/lodash@4.17.21/index.js', size: 7000, gzipSize: 2500 },
            ],
          },
        ],
      };

      const report = analyzeStats(stats, 5);
      // 40 (Home) + 2500 (lodash, once) + 30 (Settings) = 2570, NOT 5070.
      expect(report.totalGzipEstimate).to.equal(2570);
    },
  },
];
