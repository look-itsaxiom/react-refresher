# Build an agent loop simulator

Implement `runAgent`, a deterministic simulation of the loop from the last
step: a scripted "model" function decides what to do next by reading the
transcript so far, a tool registry executes actions against an in-memory
fake repo, and a permission policy plus a budget bound what the loop is
allowed to do. No network, no real LLM — the "model" is just a function you
call, which is exactly what makes this gradeable.

## Types

```ts
type Risk = 'read' | 'write' | 'exec';

type Action =
  | { type: 'tool'; name: string; args: unknown }
  | { type: 'done'; summary: string };

type TranscriptEntry =
  | { role: 'model'; action: Action }
  | { role: 'tool'; name: string; result: string };

type Model = (transcript: TranscriptEntry[]) => Action;

type State = { files: Record<string, string>; log: string[] };

type Tool = {
  risk: Risk;
  run(args: unknown, state: State): Promise<string> | string;
};

type Tools = Record<string, Tool>;

type Policy = {
  allow: Risk[];
  requireApproval?: Risk[];
  approve?: (name: string, args: unknown) => boolean;
};

type Budget = { maxSteps: number; maxToolCalls: number };

type RunAgentArgs = {
  model: Model;
  tools: Tools;
  policy: Policy;
  budget: Budget;
  state: State;
};

type RunResult =
  | { status: 'done'; summary: string; steps: number; toolCalls: number }
  | { status: 'budget-exceeded' };

function runAgent(args: RunAgentArgs): RunResult;
```

## The loop

Each iteration:

1. If `steps` has already reached `budget.maxSteps`, stop and return
   `{ status: 'budget-exceeded' }` without calling the model again.
2. Call `model(transcript)` to get the next `Action`. Append
   `{ role: 'model', action }` to the transcript and increment `steps`.
3. If the action is `{ type: 'done', summary }`, return
   `{ status: 'done', summary, steps, toolCalls }`.
4. Otherwise it's a tool call. If `toolCalls` has already reached
   `budget.maxToolCalls`, stop and return `{ status: 'budget-exceeded' }`
   (the model's `done`/`tool` decision for this turn was already recorded
   in the transcript in step 2, but the tool itself never runs).
5. Increment `toolCalls`, then resolve a `result: string` for the call:
   - **Unknown tool.** `tools[action.name]` doesn't exist →
     `result = 'error: unknown tool'`.
   - **Not allowed.** The tool exists but its `risk` isn't in
     `policy.allow` → `` result = `refused: ${name} (${risk})` ``.
   - **Needs approval.** The tool's `risk` is allowed *and* listed in
     `policy.requireApproval`. Call `policy.approve?.(name, args)`; if it
     returns `false` or `policy.approve` is missing, `result = 'denied'`.
     Otherwise run the tool and use its return value as `result`.
   - **Otherwise.** Run the tool (`await` its result — `run` can be sync or
     async) and use its return value as `result`.
6. Append `{ role: 'tool', name: action.name, result }` to the transcript
   and go back to step 1.

Order matters: check unknown-tool before allow, and allow before approval —
a refused tool never reaches the approval check, and an unknown tool never
reaches either.

## Ship something visible

Render a small default `App` that runs `runAgent` against the provided
fixtures (see the starter) and shows the final status and, on `'done'`, the
summary and the fixed file's contents — anything simple that proves the
loop actually ran.
