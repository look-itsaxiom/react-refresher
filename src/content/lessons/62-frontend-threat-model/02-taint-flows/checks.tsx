import type { Check } from '../../../types';

type NodeKind = 'source' | 'transform' | 'sink';
type GraphNode = { id: string; kind: NodeKind; label: string };
type GraphEdge = { from: string; to: string };
type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };
type TaintPath = { path: string[]; sink: string; severity: 'critical' | 'high' | 'medium' };

const graph: Graph = {
  nodes: [
    { id: 'a', kind: 'source', label: 'postMessage' },
    { id: 'b', kind: 'source', label: 'localStorage' },
    { id: 'c', kind: 'source', label: 'url.searchParams' },
    { id: 'san', kind: 'transform', label: 'sanitize' },
    { id: 'enc', kind: 'transform', label: 'encodeURIComponent' },
    { id: 'schema', kind: 'transform', label: 'validateSchema' },
    { id: 'html', kind: 'sink', label: 'dangerouslySetInnerHTML' },
    { id: 'assign', kind: 'sink', label: 'location.assign' },
    { id: 'text', kind: 'sink', label: 'React text' },
    { id: 'fetchUrl', kind: 'sink', label: 'fetch(url)' },
    { id: 'evalSink', kind: 'sink', label: 'eval' },
  ],
  edges: [
    // a: postMessage -> dangerouslySetInnerHTML, unsanitized -> should flag, critical
    { from: 'a', to: 'html' },
    // b: localStorage -> sanitize -> location.assign -> safe
    { from: 'b', to: 'san' },
    { from: 'san', to: 'assign' },
    // b also: localStorage -> React text directly (no transform) -> always safe
    { from: 'b', to: 'text' },
    // c: url.searchParams -> encodeURIComponent -> fetch(url) -> safe (encode accepted)
    { from: 'c', to: 'enc' },
    { from: 'enc', to: 'fetchUrl' },
    // c also: url.searchParams -> validateSchema -> eval -> never safe regardless
    { from: 'c', to: 'schema' },
    { from: 'schema', to: 'evalSink' },
    // a also: postMessage -> location.assign directly, unsanitized -> should flag, high
    { from: 'a', to: 'assign' },
  ],
};

export const checks: Check[] = [
  {
    name: 'taintFlows: flags an unsanitized source-to-sink path with the correct sink and severity',
    run: async ({ mod, expect }) => {
      const taintFlows = mod.taintFlows as (g: Graph) => TaintPath[];
      const flows = taintFlows(graph);
      const hit = flows.find((f) => f.sink === 'dangerouslySetInnerHTML' && f.path[0] === 'a');
      expect(hit, 'expected a flagged flow from postMessage to dangerouslySetInnerHTML').to.exist;
      expect(hit!.severity).to.equal('critical');
      expect(hit!.path[hit!.path.length - 1]).to.equal('html');
    },
  },
  {
    name: 'taintFlows: does not flag a path through the sink\'s accepted sanitizer',
    run: async ({ mod, expect }) => {
      const taintFlows = mod.taintFlows as (g: Graph) => TaintPath[];
      const flows = taintFlows(graph);
      const shouldBeSafe = flows.find((f) => f.path.includes('san') && f.sink === 'location.assign');
      expect(shouldBeSafe, 'a path sanitized before location.assign must not be flagged').to.not.exist;
    },
  },
  {
    name: 'taintFlows: never flags a React text sink, even with no transform at all',
    run: async ({ mod, expect }) => {
      const taintFlows = mod.taintFlows as (g: Graph) => TaintPath[];
      const flows = taintFlows(graph);
      const textHit = flows.find((f) => f.sink === 'React text');
      expect(textHit, 'React text auto-escapes and should never appear in results').to.not.exist;
    },
  },
  {
    name: 'taintFlows: accepts either listed sanitizer for fetch(url), and flags eval regardless of any transform',
    run: async ({ mod, expect }) => {
      const taintFlows = mod.taintFlows as (g: Graph) => TaintPath[];
      const flows = taintFlows(graph);
      const fetchHit = flows.find((f) => f.sink === 'fetch(url)');
      expect(fetchHit, 'encodeURIComponent is an accepted sanitizer for fetch(url) and should not be flagged').to.not.exist;

      const evalHit = flows.find((f) => f.sink === 'eval');
      expect(evalHit, 'eval can never be neutralized, even behind validateSchema').to.exist;
      expect(evalHit!.severity).to.equal('critical');
    },
  },
  {
    name: 'taintFlows: reports every distinct unsanitized path, not just one per source',
    run: async ({ mod, expect }) => {
      const taintFlows = mod.taintFlows as (g: Graph) => TaintPath[];
      const flows = taintFlows(graph);
      // postMessage (a) has two unsanitized flows: -> dangerouslySetInnerHTML, -> location.assign
      const fromA = flows.filter((f) => f.path[0] === 'a');
      expect(fromA.length).to.equal(2);
      expect(fromA.map((f) => f.sink).sort()).to.deep.equal(['dangerouslySetInnerHTML', 'location.assign']);
      const assignHit = fromA.find((f) => f.sink === 'location.assign');
      expect(assignHit!.severity).to.equal('high');
    },
  },
];
