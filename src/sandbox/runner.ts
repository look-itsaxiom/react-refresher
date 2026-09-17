import { act, type ComponentType } from 'react';
import { cleanup, render } from '@testing-library/react';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { expect } from 'chai';
import type { Check, CheckContext } from '../content/types';
import { CompileError } from './compile';
import { evaluate, ModuleNotFoundError, type ModuleRegistry, type UserFiles } from './modules';
import { controls } from './server/core';
import type { CheckResult } from './protocol';

export type RunChecksOutcome =
  | { kind: 'compile-error'; error: CompileError | ModuleNotFoundError }
  | { kind: 'results'; results: CheckResult[]; allPassed: boolean };

export function getComponent(mod: Record<string, unknown>): ComponentType {
  const candidate = mod.default ?? mod.App;
  if (typeof candidate !== 'function') {
    throw new Error("Your entry file must `export default` a component (or export one named `App`).");
  }
  return candidate as ComponentType;
}

export function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Check timed out after ${ms}ms. Is something awaiting forever, or looping?`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (err: unknown) => { clearTimeout(timer); reject(err); },
    );
  });
}

declare global {
  // eslint-disable-next-line no-var -- React reads this global
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** Silence React's error-boundary console noise while a check intentionally throws. */
function quietConsoleError<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  return fn().finally(() => { console.error = original; });
}

export async function runChecks(opts: {
  files: UserFiles;
  entry?: string;
  checks: Check[];
  registry: ModuleRegistry;
  timeoutMs?: number;
}): Promise<RunChecksOutcome> {
  const entry = opts.entry ?? 'App.tsx';
  const timeoutMs = opts.timeoutMs ?? 5000;

  // Compile everything once up front so syntax/import errors surface before any check runs.
  try {
    evaluate(opts.files, entry, opts.registry);
  } catch (e) {
    if (e instanceof CompileError || e instanceof ModuleNotFoundError) return { kind: 'compile-error', error: e };
    // A runtime error at module top level is a check failure, handled below per check.
  }

  const previousActEnv = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const results: CheckResult[] = [];

  try {
    for (const check of opts.checks) {
      controls.reset();
      controls.setLatency(0);
      let evaluated: Record<string, unknown> | null = null;
      const ctx: CheckContext = {
        get mod() {
          evaluated ??= evaluate(opts.files, entry, opts.registry);
          return evaluated;
        },
        get Component() {
          return getComponent(this.mod);
        },
        render,
        screen,
        within,
        user: userEvent.setup(),
        act,
        expect,
        server: controls,
        sleep,
      };
      const started = performance.now();
      try {
        await withTimeout(quietConsoleError(async () => { await check.run(ctx); }), timeoutMs);
        results.push({ name: check.name, status: 'pass', durationMs: performance.now() - started });
      } catch (e) {
        results.push({ name: check.name, status: 'fail', error: formatError(e), durationMs: performance.now() - started });
      } finally {
        cleanup();
      }
    }
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
    controls.reset();
  }

  return { kind: 'results', results, allPassed: results.every((r) => r.status === 'pass') };
}
