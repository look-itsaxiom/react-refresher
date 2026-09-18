import type { Check } from '../../../types';

type ModuleGraph = {
  order: string[];
  edges: Array<{ from: string; to: string }>;
  dynamicEdges: Array<{ from: string; to: string }>;
};
type Chunk = { id: string; modules: string[]; imports: string[] };

export const checks: Check[] = [
  {
    name: 'splitChunks: a module reachable from two async routes gets its own shared chunk, not duplicated into either route',
    run: async ({ mod, expect }) => {
      const splitChunks = mod.splitChunks as (graph: ModuleGraph) => { chunks: Chunk[] };

      const graph: ModuleGraph = {
        order: ['shared.js', 'routeA.js', 'routeB.js', 'entry.js'],
        edges: [
          { from: 'routeA.js', to: 'shared.js' },
          { from: 'routeB.js', to: 'shared.js' },
        ],
        dynamicEdges: [
          { from: 'entry.js', to: 'routeA.js' },
          { from: 'entry.js', to: 'routeB.js' },
        ],
      };

      const { chunks } = splitChunks(graph);
      const sharedChunk = chunks.find((c) => c.modules.includes('shared.js'));
      const routeAChunk = chunks.find((c) => c.modules.includes('routeA.js'));
      const routeBChunk = chunks.find((c) => c.modules.includes('routeB.js'));

      expect(sharedChunk, 'no chunk contains shared.js').to.exist;
      expect(routeAChunk, 'no chunk contains routeA.js').to.exist;
      expect(routeBChunk, 'no chunk contains routeB.js').to.exist;

      expect(sharedChunk).to.not.equal(routeAChunk);
      expect(sharedChunk).to.not.equal(routeBChunk);
      expect(routeAChunk!.modules).to.not.include('shared.js');
      expect(routeBChunk!.modules).to.not.include('shared.js');

      expect(routeAChunk!.imports).to.include(sharedChunk!.id);
      expect(routeBChunk!.imports).to.include(sharedChunk!.id);
    },
  },
  {
    name: 'splitChunks: a module reachable from both the entry and an async route stays in the entry chunk',
    run: async ({ mod, expect }) => {
      const splitChunks = mod.splitChunks as (graph: ModuleGraph) => { chunks: Chunk[] };

      const graph: ModuleGraph = {
        order: ['utils.js', 'routeC.js', 'entry.js'],
        edges: [
          { from: 'entry.js', to: 'utils.js' },
          { from: 'routeC.js', to: 'utils.js' },
        ],
        dynamicEdges: [{ from: 'entry.js', to: 'routeC.js' }],
      };

      const { chunks } = splitChunks(graph);
      const entryChunk = chunks.find((c) => c.modules.includes('entry.js'));
      const routeCChunk = chunks.find((c) => c.modules.includes('routeC.js'));

      expect(entryChunk, 'no chunk contains entry.js').to.exist;
      expect(routeCChunk, 'no chunk contains routeC.js').to.exist;

      expect(entryChunk!.modules).to.include('utils.js');
      expect(routeCChunk!.modules).to.not.include('utils.js');
      expect(chunks.filter((c) => c.modules.includes('utils.js'))).to.have.lengthOf(1);
    },
  },
];
