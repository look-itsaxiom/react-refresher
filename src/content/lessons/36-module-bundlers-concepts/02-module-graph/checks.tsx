import type { Check } from '../../../types';

type ModuleGraph = {
  order: string[];
  edges: Array<{ from: string; to: string }>;
  dynamicEdges: Array<{ from: string; to: string }>;
};

export const checks: Check[] = [
  {
    name: 'buildGraph: a module shared by two importers appears once, before both, and both edges are recorded',
    run: async ({ mod, expect }) => {
      const buildGraph = mod.buildGraph as (files: Record<string, string>, entry: string) => ModuleGraph;
      const files: Record<string, string> = {
        'entry.js': `
          import { x } from './a.js';
          import { y } from './b.js';
        `,
        'a.js': `
          import { shared } from './shared.js';
          export const x = shared;
        `,
        'b.js': `
          import { shared } from './shared.js';
          export const y = shared;
        `,
        'shared.js': `
          export const shared = 1;
        `,
      };

      const graph = buildGraph(files, 'entry.js');

      expect(graph.order.filter((id) => id === 'shared.js')).to.have.lengthOf(1);
      const sharedIndex = graph.order.indexOf('shared.js');
      const aIndex = graph.order.indexOf('a.js');
      const bIndex = graph.order.indexOf('b.js');
      expect(sharedIndex).to.be.lessThan(aIndex);
      expect(sharedIndex).to.be.lessThan(bIndex);

      const edgeKeys = graph.edges.map((e) => `${e.from}->${e.to}`);
      expect(edgeKeys).to.include('a.js->shared.js');
      expect(edgeKeys).to.include('b.js->shared.js');
    },
  },
  {
    name: 'buildGraph: a cycle is recorded in edges without recursing forever or duplicating a module in order',
    run: async ({ mod, expect }) => {
      const buildGraph = mod.buildGraph as (files: Record<string, string>, entry: string) => ModuleGraph;
      const files: Record<string, string> = {
        'a.js': `
          import { b } from './b.js';
          export const a = 1;
        `,
        'b.js': `
          import { a } from './a.js';
          export const b = 2;
        `,
      };

      const graph = buildGraph(files, 'a.js');

      expect(graph.order).to.have.lengthOf(2);
      expect(graph.order.filter((id) => id === 'a.js')).to.have.lengthOf(1);
      expect(graph.order.filter((id) => id === 'b.js')).to.have.lengthOf(1);

      const edgeKeys = graph.edges.map((e) => `${e.from}->${e.to}`);
      expect(edgeKeys).to.include('a.js->b.js');
      expect(edgeKeys).to.include('b.js->a.js');
    },
  },
  {
    name: 'treeShake: an export that is never imported by name is reported as unused, one that is imported is not',
    run: async ({ mod, expect }) => {
      const buildGraph = mod.buildGraph as (files: Record<string, string>, entry: string) => ModuleGraph;
      const treeShake = mod.treeShake as (
        graph: ModuleGraph,
        files: Record<string, string>,
      ) => Record<string, string[]>;

      const files: Record<string, string> = {
        'entry.js': `
          import { add } from './math.js';
          console.log(add(1, 2));
        `,
        'math.js': `
          export const add = (a, b) => a + b;
          export const subtract = (a, b) => a - b;
        `,
      };

      const graph = buildGraph(files, 'entry.js');
      const unused = treeShake(graph, files);

      expect(unused['math.js']).to.deep.equal(['subtract']);
      expect(unused['entry.js']).to.deep.equal([]);
    },
  },
];
