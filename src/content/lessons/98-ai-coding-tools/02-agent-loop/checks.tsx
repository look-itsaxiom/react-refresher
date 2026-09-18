import type { Check } from '../../../types';

type Risk = 'read' | 'write' | 'exec';

type Action = { type: 'tool'; name: string; args: unknown } | { type: 'done'; summary: string };

type TranscriptEntry = { role: 'model'; action: Action } | { role: 'tool'; name: string; result: string };

type ModelFn = (transcript: TranscriptEntry[]) => Action;

type State = { files: Record<string, string>; log: string[] };

type Tool = { risk: Risk; run(args: unknown, state: State): Promise<string> | string };
type Tools = Record<string, Tool>;

type Policy = {
  allow: Risk[];
  requireApproval?: Risk[];
  approve?: (name: string, args: unknown) => boolean;
};

type Budget = { maxSteps: number; maxToolCalls: number };

type RunAgentArgs = { model: ModelFn; tools: Tools; policy: Policy; budget: Budget; state: State };

type RunResult =
  | { status: 'done'; summary: string; steps: number; toolCalls: number }
  | { status: 'budget-exceeded' };

type Mod = { runAgent: (args: RunAgentArgs) => Promise<RunResult> };

function makeTools(): Tools {
  return {
    read_file: {
      risk: 'read',
      run: (args, state) => state.files[(args as { path: string }).path] ?? '',
    },
    write_file: {
      risk: 'write',
      run: (args, state) => {
        const { path, content } = args as { path: string; content: string };
        state.files[path] = content;
        state.log.push(`wrote ${path}`);
        return 'ok';
      },
    },
    run_tests: {
      risk: 'exec',
      run: (_args, state) => {
        const passed = (state.files['sum.ts'] ?? '').includes('a + b');
        state.log.push(`tests: ${passed ? 'pass' : 'fail'}`);
        return passed ? 'pass' : 'fail';
      },
    },
  };
}

function fixBugModel(transcript: TranscriptEntry[]): Action {
  const toolResults = transcript.filter((e): e is Extract<TranscriptEntry, { role: 'tool' }> => e.role === 'tool');
  if (toolResults.length === 0) return { type: 'tool', name: 'read_file', args: { path: 'sum.ts' } };
  if (toolResults.length === 1) {
    return {
      type: 'tool',
      name: 'write_file',
      args: { path: 'sum.ts', content: 'export function sum(a: number, b: number) {\n  return a + b;\n}\n' },
    };
  }
  if (toolResults.length === 2) return { type: 'tool', name: 'run_tests', args: {} };
  const last = toolResults[toolResults.length - 1]!;
  if (last.result === 'pass') return { type: 'done', summary: 'fixed sum.ts so the tests pass' };
  return { type: 'tool', name: 'read_file', args: { path: 'sum.ts' } };
}

export const checks: Check[] = [
  {
    name: 'happy path: fixes the bug and reports done once run_tests returns pass',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { runAgent } = mod as unknown as Mod;

      const state: State = { files: { 'sum.ts': 'export function sum(a: number, b: number) {\n  return a - b;\n}\n' }, log: [] };
      const result = await runAgent({
        model: fixBugModel,
        tools: makeTools(),
        policy: { allow: ['read', 'write', 'exec'] },
        budget: { maxSteps: 10, maxToolCalls: 10 },
        state,
      });

      expect(result.status).to.equal('done');
      if (result.status !== 'done') return;
      expect(result.steps).to.equal(4);
      expect(result.toolCalls).to.equal(3);
      expect(state.files['sum.ts']).to.include('a + b');
      expect(state.log).to.include('tests: pass');
    },
  },
  {
    name: 'a read-only policy refuses a write tool call, and the write never happens',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { runAgent } = mod as unknown as Mod;

      const state: State = { files: { 'sum.ts': 'original' }, log: [] };
      let asked = false;
      const model: ModelFn = (transcript) => {
        if (!asked) {
          asked = true;
          return { type: 'tool', name: 'write_file', args: { path: 'sum.ts', content: 'changed' } };
        }
        const last = transcript[transcript.length - 1];
        expect(last).to.deep.equal({ role: 'tool', name: 'write_file', result: 'refused: write_file (write)' });
        return { type: 'done', summary: 'stopped after refusal' };
      };

      const result = await runAgent({
        model,
        tools: makeTools(),
        policy: { allow: ['read'] },
        budget: { maxSteps: 10, maxToolCalls: 10 },
        state,
      });

      expect(result.status).to.equal('done');
      expect(state.files['sum.ts']).to.equal('original');
      expect(state.log).to.have.length(0);
    },
  },
  {
    name: 'an approval-required tool that gets denied never runs, and the denial is recorded',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { runAgent } = mod as unknown as Mod;

      const state: State = { files: { 'sum.ts': 'export function sum(a: number, b: number) {\n  return a + b;\n}\n' }, log: [] };
      let asked = false;
      const model: ModelFn = (transcript) => {
        if (!asked) {
          asked = true;
          return { type: 'tool', name: 'run_tests', args: {} };
        }
        const last = transcript[transcript.length - 1];
        expect(last).to.deep.equal({ role: 'tool', name: 'run_tests', result: 'denied' });
        return { type: 'done', summary: 'stopped after denial' };
      };

      const result = await runAgent({
        model,
        tools: makeTools(),
        policy: { allow: ['read', 'write', 'exec'], requireApproval: ['exec'], approve: () => false },
        budget: { maxSteps: 10, maxToolCalls: 10 },
        state,
      });

      expect(result.status).to.equal('done');
      // run_tests would have pushed a 'tests: ...' log line if it had actually executed.
      expect(state.log).to.have.length(0);
    },
  },
  {
    name: 'stops with budget-exceeded once maxSteps is reached, without asking the model again',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { runAgent } = mod as unknown as Mod;

      const state: State = { files: {}, log: [] };
      let calls = 0;
      const model: ModelFn = () => {
        calls += 1;
        return { type: 'tool', name: 'read_file', args: { path: 'sum.ts' } };
      };

      const result = await runAgent({
        model,
        tools: makeTools(),
        policy: { allow: ['read', 'write', 'exec'] },
        budget: { maxSteps: 2, maxToolCalls: 100 },
        state,
      });

      expect(result).to.deep.equal({ status: 'budget-exceeded' });
      expect(calls).to.equal(2);
    },
  },
  {
    name: 'a call to a tool that is not in the registry produces "error: unknown tool" and the loop continues',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { runAgent } = mod as unknown as Mod;

      const state: State = { files: {}, log: [] };
      let asked = false;
      const model: ModelFn = (transcript) => {
        if (!asked) {
          asked = true;
          return { type: 'tool', name: 'delete_repo', args: {} };
        }
        const last = transcript[transcript.length - 1];
        expect(last).to.deep.equal({ role: 'tool', name: 'delete_repo', result: 'error: unknown tool' });
        return { type: 'done', summary: 'gave up on the unknown tool' };
      };

      const result = await runAgent({
        model,
        tools: makeTools(),
        policy: { allow: ['read', 'write', 'exec'] },
        budget: { maxSteps: 10, maxToolCalls: 10 },
        state,
      });

      expect(result.status).to.equal('done');
    },
  },
  {
    name: 'transcript entries are appended in order: model action, then its matching tool result',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { runAgent } = mod as unknown as Mod;

      const state: State = { files: { 'sum.ts': 'export function sum(a: number, b: number) {\n  return a + b;\n}\n' }, log: [] };
      const model: ModelFn = (transcript) => {
        if (transcript.length === 0) {
          return { type: 'tool', name: 'read_file', args: { path: 'sum.ts' } };
        }
        if (transcript.length === 2) {
          expect(transcript[0]).to.deep.equal({
            role: 'model',
            action: { type: 'tool', name: 'read_file', args: { path: 'sum.ts' } },
          });
          expect(transcript[1]!.role).to.equal('tool');
          expect((transcript[1] as { name: string }).name).to.equal('read_file');
          return { type: 'tool', name: 'run_tests', args: {} };
        }
        expect(transcript).to.have.length(4);
        expect(transcript[2]).to.deep.equal({ role: 'model', action: { type: 'tool', name: 'run_tests', args: {} } });
        expect(transcript[3]).to.deep.equal({ role: 'tool', name: 'run_tests', result: 'pass' });
        return { type: 'done', summary: 'checked the ordering' };
      };

      const result = await runAgent({
        model,
        tools: makeTools(),
        policy: { allow: ['read', 'write', 'exec'] },
        budget: { maxSteps: 10, maxToolCalls: 10 },
        state,
      });

      expect(result).to.deep.equal({ status: 'done', summary: 'checked the ordering', steps: 3, toolCalls: 2 });
    },
  },
];
