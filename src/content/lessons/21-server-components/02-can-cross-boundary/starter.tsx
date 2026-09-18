import { isValidElement } from 'react';

/**
 * Stand-ins for the two kinds of function React actually allows across the
 * server -> client boundary: a Server Function ('use server') and a
 * reference to something that already lives in a 'use client' module. Real
 * React tags these internally; here we just attach a marker so the exercise
 * can be graded without a real bundler in the loop. Do not change these.
 */
export const SERVER_FUNCTION_MARKER = Symbol.for('rsc-demo.server-function');
export const CLIENT_REFERENCE_MARKER = Symbol.for('rsc-demo.client-reference');

export function asServerFunction<T extends (...args: never[]) => unknown>(fn: T): T {
  (fn as unknown as Record<symbol, boolean>)[SERVER_FUNCTION_MARKER] = true;
  return fn;
}

export function asClientReference<T extends (...args: never[]) => unknown>(fn: T): T {
  (fn as unknown as Record<symbol, boolean>)[CLIENT_REFERENCE_MARKER] = true;
  return fn;
}

/**
 * Model of React's "can this prop value be serialized into an RSC payload"
 * check. See prompt.md for the exact rules to implement.
 */
export function canCrossBoundary(value: unknown): boolean {
  // TODO: implement the rules from prompt.md
  return false;
}

const samples: Array<{ label: string; value: unknown }> = [
  { label: '42', value: 42 },
  { label: "() => {} (unmarked function)", value: () => {} },
  { label: 'asServerFunction(fn)', value: asServerFunction(() => 'ok') },
  { label: "Symbol('local')", value: Symbol('local') },
  { label: 'new Date()', value: new Date() },
];

export default function App() {
  return (
    <ul>
      {samples.map(({ label, value }) => (
        <li key={label} data-testid={label}>
          {label}: {String(canCrossBoundary(value))}
        </li>
      ))}
    </ul>
  );
}
