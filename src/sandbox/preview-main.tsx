import { baseRegistry } from './registry';
import { findExercise } from '../content/registry';
import { createPreviewHost } from './preview-host';
import type { ConsoleLevel, FrameToParent, ParentToFrame } from './protocol';

// Some libraries probe process.env; the iframe has no bundler define for it.
(globalThis as { process?: unknown }).process ??= { env: {} };

function post(msg: FrameToParent): void {
  window.parent.postMessage(msg, window.location.origin);
}

function serialize(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg, null, 2) ?? String(arg);
  } catch {
    return String(arg);
  }
}

for (const level of ['log', 'info', 'warn', 'error'] as ConsoleLevel[]) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    post({ type: 'console', level, args: args.map(serialize) });
  };
}

window.addEventListener('error', (e) => post({ type: 'console', level: 'error', args: [`Uncaught: ${e.message}`] }));
window.addEventListener('unhandledrejection', (e) =>
  post({ type: 'console', level: 'error', args: [`Unhandled promise rejection: ${serialize(e.reason)}`] }),
);

const mount = document.getElementById('root');
if (!mount) throw new Error('preview.html is missing #root');

const host = createPreviewHost({
  post,
  registry: baseRegistry,
  findChecks: (key) => findExercise(key)?.step.checks,
  mount,
});

let queue: Promise<void> = Promise.resolve();
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window.parent) return;
  const data = event.data as Partial<ParentToFrame> | null;
  if (!data || data.type !== 'run') return;
  // Serialize runs so a checks run and a preview run never interleave.
  queue = queue.then(() => host.handle(data as ParentToFrame)).catch((e: unknown) => {
    post({ type: 'runtime-error', runId: (data as ParentToFrame).runId, message: e instanceof Error ? e.message : String(e) });
  });
});

post({ type: 'ready' });
