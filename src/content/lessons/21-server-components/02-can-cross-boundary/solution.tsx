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
  if (value === null || value === undefined) return true;

  const t = typeof value;

  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') {
    return true;
  }

  if (t === 'symbol') {
    return Symbol.keyFor(value as symbol) !== undefined;
  }

  if (t === 'function') {
    const marked = value as unknown as Record<symbol, boolean>;
    return Boolean(marked[SERVER_FUNCTION_MARKER]) || Boolean(marked[CLIENT_REFERENCE_MARKER]);
  }

  if (t !== 'object') return false;

  if (isValidElement(value)) return true;
  if (value instanceof Promise) return true;
  if (value instanceof Date) return true;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return true;

  if (Array.isArray(value)) {
    return value.every((item) => canCrossBoundary(item));
  }

  if (value instanceof Map) {
    for (const [key, val] of value) {
      if (!canCrossBoundary(key) || !canCrossBoundary(val)) return false;
    }
    return true;
  }

  if (value instanceof Set) {
    for (const item of value) {
      if (!canCrossBoundary(item)) return false;
    }
    return true;
  }

  // Only plain object literals pass; class instances and null-prototype
  // objects (Object.create(null)) are rejected.
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;

  return Object.values(value as Record<string, unknown>).every((val) => canCrossBoundary(val));
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
