# Build a task triager and a review checklist

Two small, pure functions that turn the judgment calls from the last
concept step into rules you can actually apply consistently — the kind of
thing a team writes down once instead of re-litigating every PR.

## Types

```ts
type TaskKind =
  | 'boilerplate' | 'migration' | 'refactor' | 'bugfix'
  | 'feature' | 'architecture' | 'security' | 'incident';

type Task = {
  kind: TaskKind;
  hasTests: boolean;
  specClarity: 'clear' | 'vague';
  blastRadius: 'file' | 'module' | 'system';
  sensitivity: 'low' | 'high';
};

type Mode = 'delegate' | 'pair' | 'manual';

type Triage = { mode: Mode; guardrails: string[]; reason: string };

function triageTask(task: Task): Triage;

type Diff = {
  filesChanged: number;
  addedDeps: string[];
  testsModified: boolean;
  testsAdded: boolean;
  touchesAuthOrPayments: boolean;
};

function reviewChecklist(diff: Diff): string[];
```

## `triageTask`

Build `guardrails` (a `string[]`, no duplicates) and decide `mode` by
applying every rule below that matches — a task can trigger several at
once, and their guardrails all accumulate, even if only one of them ends up
deciding the mode.

1. **Architecture is never delegated.** `kind === 'architecture'` forces
   `mode: 'manual'` — this overrides every other rule. Add the guardrail
   `'treat the agent output as one proposal, not the decision'`.
2. **Security-sensitive work is never delegated.** `kind === 'security'` or
   `sensitivity === 'high'` rules out `'delegate'` (the task becomes at
   least `'pair'`, or `'manual'` if rule 1 also applies). Add the guardrail
   `'require a second human reviewer before merge'`.
3. **Incidents keep a human driving the fix.** `kind === 'incident'` rules
   out `'delegate'`. Add the guardrail
   `'use the agent to gather evidence (logs, diffs, timelines), not to ship the fix unattended'`.
4. **A vague spec has to become a clear one first.** `specClarity ===
   'vague'` rules out `'delegate'`. Add the guardrail `'write a spec first'`.
5. **Missing tests always get a guardrail**, independent of the eventual
   mode: `!hasTests` adds `'add characterization tests before changes'`.
6. **Blast radius.** `blastRadius === 'system'` rules out `'delegate'` and
   adds the guardrail `'small reviewable diffs'`. `blastRadius === 'module'`
   (and `'system'` doesn't apply) adds the guardrail
   `'review the diff module by module, not only the end result'`.
7. **What's actually safe to hand off.** If none of rules 1-4 or the
   `'system'` half of rule 6 ruled out delegating, *and* `kind` is one of
   `'boilerplate'`, `'migration'`, or `'refactor'`, *and* `hasTests` is
   `true`, *and* `specClarity === 'clear'`, *and* `sensitivity === 'low'`,
   the task is safe to delegate: `mode: 'delegate'`. Add the guardrail
   `'run typecheck and tests in the loop'`.
8. Anything that doesn't hit rule 1 (manual) or rule 7 (delegate) lands on
   `mode: 'pair'`.

`reason` is a short string explaining the decision — join together, with
`'; '`, one short phrase per rule that actually fired (rules 1-4, the
`'system'` half of rule 6, and rule 7 each contribute a phrase when they
apply; the exact wording is yours, but it should mention what triggered
it — e.g. a `reason` for an architecture task should mention
"architecture", one for a vague-spec task should mention "spec"). If
nothing fired, use a reason that says so, along the lines of "no strong
signal either way, default to pairing".

## `reviewChecklist`

Build an **ordered** `string[]` by applying these checks in this exact
order (skip any that don't apply):

1. `touchesAuthOrPayments` → `'get a second reviewer for auth or payments code'`
2. `filesChanged > 15` → `'ask for a split'`
3. For every dependency in `addedDeps`, in array order → one item each:
   `` `audit new dependency "${dep}" (lesson 68)` ``
4. `testsModified && !testsAdded` → `'verify tests were not weakened to pass'`
5. Always last, unconditionally → `'read the diff line by line before approving'`

## Ship something visible

Render a small default `App` that calls both functions with a couple of
sample inputs and lists the results, so the preview shows something.
