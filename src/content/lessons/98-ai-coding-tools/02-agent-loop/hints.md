Since `tool.run` can return a `Promise<string>`, `runAgent` has to be an
`async function` returning `Promise<RunResult>`, even though most of the
fixture tools happen to run synchronously. Write the loop as an infinite
`for (;;)` (or `while (true)`) with explicit `return` statements for both
exit conditions — don't try to model this with a fixed-size `for` loop over
`maxSteps`, since a `'done'` action can end the loop early.

---

Keep the two budget checks separate and in the order the prompt describes:
check `steps >= budget.maxSteps` **before** calling the model each
iteration, and check `toolCalls >= budget.maxToolCalls` **after** the model
has returned a `'tool'` action but **before** you run it. Both checks
short-circuit with `return { status: 'budget-exceeded' }` immediately —
don't push anything else to the transcript first.

---

Resolving a tool call is its own small decision tree — pull it into a
helper so the main loop stays readable:

```ts
async function resolveResult(action, tools, policy, state): Promise<string> {
  const tool = tools[action.name];
  if (!tool) return 'error: unknown tool';
  if (!policy.allow.includes(tool.risk)) return `refused: ${action.name} (${tool.risk})`;
  if (policy.requireApproval?.includes(tool.risk)) {
    const approved = policy.approve?.(action.name, action.args) ?? false;
    if (!approved) return 'denied';
  }
  return tool.run(action.args, state);
}
```

The order of those four checks is exactly the order in the prompt: unknown
tool, then allow, then approval, then run. Getting the order backwards
(e.g. checking approval before allow) will pass the happy-path check but
fail the refusal one.

---

Full shape of the loop body:

```ts
export async function runAgent({ model, tools, policy, budget, state }) {
  const transcript = [];
  let steps = 0;
  let toolCalls = 0;

  for (;;) {
    if (steps >= budget.maxSteps) return { status: 'budget-exceeded' };

    const action = model(transcript);
    transcript.push({ role: 'model', action });
    steps += 1;

    if (action.type === 'done') {
      return { status: 'done', summary: action.summary, steps, toolCalls };
    }

    if (toolCalls >= budget.maxToolCalls) return { status: 'budget-exceeded' };
    toolCalls += 1;

    const result = await resolveResult(action, tools, policy, state);
    transcript.push({ role: 'tool', name: action.name, result });
  }
}
```

Remember `model` is a plain function you call synchronously — it isn't
async itself, it just reads whatever's in `transcript` so far and returns
one `Action`. The scripted models in the checks decide their next move by
counting how many `{ role: 'tool' }` entries are already in the transcript,
which is exactly the pattern the `fixBugModel` fixture uses.
