For `runOrdered`: you need one promise that resolves once every step has reported in,
regardless of which order they arrive. Set up a counter of how many steps are left, and a
`done(label)` function that pushes `label` onto a results array, decrements the counter,
and resolves the outer promise when the counter hits zero. Then loop over `steps` once,
synchronously, and for each one call the scheduling API matching its `kind` — that
dispatch loop itself doesn't need to wait for anything.
---
The dispatch for each kind: `'sync'` calls `done(step.label)` immediately, inline.
`'microtask'` calls `queueMicrotask(() => done(step.label))`. `'task'` calls
`setTimeout(() => done(step.label), 0)`. `'raf'` calls
`requestAnimationFrame(() => done(step.label))`. Do all four dispatches in the same
synchronous pass over the array — don't await anything between them, or you'll change the
relative ordering.
---
For `yieldToMain`: create a `new MessageChannel()`, set `channel.port1.onmessage` to
resolve the promise, and call `channel.port2.postMessage(undefined)` to trigger it. That
`postMessage` → `onmessage` round-trip is itself a task boundary, so the promise resolves
on the next task rather than immediately or merely after a microtask drain.
---
```ts
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(undefined);
  });
}

export function runOrdered(steps: Step[]): Promise<string[]> {
  const order: string[] = [];
  return new Promise((resolve) => {
    let remaining = steps.length;
    const done = (label: string) => {
      order.push(label);
      remaining--;
      if (remaining === 0) resolve(order);
    };
    for (const step of steps) {
      if (step.kind === 'sync') done(step.label);
      else if (step.kind === 'microtask') queueMicrotask(() => done(step.label));
      else if (step.kind === 'task') setTimeout(() => done(step.label), 0);
      else requestAnimationFrame(() => done(step.label));
    }
  });
}
```
