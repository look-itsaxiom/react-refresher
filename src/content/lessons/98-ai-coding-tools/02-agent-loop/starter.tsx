import * as React from 'react';

export type Risk = 'read' | 'write' | 'exec';

export type Action = { type: 'tool'; name: string; args: unknown } | { type: 'done'; summary: string };

export type TranscriptEntry = { role: 'model'; action: Action } | { role: 'tool'; name: string; result: string };

export type Model = (transcript: TranscriptEntry[]) => Action;

export type State = { files: Record<string, string>; log: string[] };

export type Tool = {
  risk: Risk;
  run(args: unknown, state: State): Promise<string> | string;
};

export type Tools = Record<string, Tool>;

export type Policy = {
  allow: Risk[];
  requireApproval?: Risk[];
  approve?: (name: string, args: unknown) => boolean;
};

export type Budget = { maxSteps: number; maxToolCalls: number };

export type RunAgentArgs = {
  model: Model;
  tools: Tools;
  policy: Policy;
  budget: Budget;
  state: State;
};

export type RunResult =
  | { status: 'done'; summary: string; steps: number; toolCalls: number }
  | { status: 'budget-exceeded' };

export async function runAgent(args: RunAgentArgs): Promise<RunResult> {
  // TODO: implement the loop described in prompt.md. `tool.run` can return a
  // Promise, so this function is async and every tool result must be awaited.
  return { status: 'budget-exceeded' };
}

// --- Fixture tools, operating on an in-memory fake repo ---

export const fixtureTools: Tools = {
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

/** A scripted "model": reads sum.ts, writes a fix, runs tests, then reports done once they pass. */
export function fixBugModel(transcript: TranscriptEntry[]): Action {
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

function Runner({ state }: { state: State }) {
  const [result, setResult] = React.useState<RunResult | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    runAgent({
      model: fixBugModel,
      tools: fixtureTools,
      policy: { allow: ['read', 'write', 'exec'] },
      budget: { maxSteps: 10, maxToolCalls: 10 },
      state,
    }).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>Result</h3>
      <pre>{result ? JSON.stringify(result, null, 2) : 'running...'}</pre>
      <h3>sum.ts</h3>
      <pre>{state.files['sum.ts']}</pre>
      <h3>log</h3>
      <ul>
        {state.log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [state] = React.useState<State>(() => ({
    files: { 'sum.ts': 'export function sum(a: number, b: number) {\n  return a - b; // bug\n}\n' },
    log: [],
  }));

  return <Runner state={state} />;
}
