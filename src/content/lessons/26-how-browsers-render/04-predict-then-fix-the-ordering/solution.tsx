import { useState } from 'react';

export type Step = { kind: 'sync' | 'microtask' | 'task' | 'raf'; label: string };

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

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(undefined);
  });
}

function busyWorkMs(ms: number): void {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // burn time synchronously, standing in for an expensive computation
  }
}

/**
 * Simulates a long synchronous computation broken into chunks that yield between each
 * one — the pattern you'd use to keep INP low on a real expensive computation. Provided —
 * don't change; it calls your `yieldToMain`.
 */
export async function runLongTask(chunks: number, msPerChunk: number, onYield?: () => void): Promise<void> {
  for (let i = 0; i < chunks; i++) {
    busyWorkMs(msPerChunk);
    await yieldToMain();
    onYield?.();
  }
}

const demoSteps: Step[] = [
  { kind: 'raf', label: 'raf' },
  { kind: 'task', label: 'task' },
  { kind: 'sync', label: 'sync' },
  { kind: 'microtask', label: 'microtask' },
];

export default function App() {
  const [order, setOrder] = useState<string[] | null>(null);
  const [ticks, setTicks] = useState(0);
  const [running, setRunning] = useState(false);

  return (
    <div>
      <button
        onClick={async () => {
          const result = await runOrdered(demoSteps);
          setOrder(result);
        }}
      >
        Run ordering demo
      </button>
      {order && <p data-testid="order">{order.join(', ')}</p>}

      <button
        disabled={running}
        onClick={async () => {
          setRunning(true);
          setTicks(0);
          let stop = false;
          const tick = () => {
            if (stop) return;
            setTicks((t) => t + 1);
            setTimeout(tick, 0);
          };
          tick();
          await runLongTask(6, 4);
          stop = true;
          setRunning(false);
        }}
      >
        Run long task
      </button>
      <p data-testid="ticks">{ticks}</p>
    </div>
  );
}
