import { describe, it, expect } from 'vitest';
import { evaluate, ModuleNotFoundError, esm } from './modules';
import { CompileError } from './compile';
import { baseRegistry } from './registry';

const registry = {
  'fake-lib': esm({ default: () => 'default!', named: 42 }),
};

describe('evaluate', () => {
  it('evaluates the entry and returns its exports', () => {
    const mod = evaluate({ 'index.ts': 'export const answer = 6 * 7; export default "hi";' }, 'index.ts', registry);
    expect(mod.answer).toBe(42);
    expect(mod.default).toBe('hi');
  });

  it('resolves relative imports with and without extensions, including nested folders', () => {
    const mod = evaluate(
      {
        'App.tsx': "import { a } from './lib/a'; import b from './b.ts'; export const sum = a + b;",
        'lib/a.ts': "import { base } from '../base'; export const a = base + 1;",
        'base.ts': 'export const base = 10;',
        'b.ts': 'export default 5;',
      },
      'App.tsx',
      registry,
    );
    expect(mod.sum).toBe(16);
  });

  it('resolves registry modules with ESM interop for default and named imports', () => {
    const mod = evaluate(
      { 'x.ts': "import d, { named } from 'fake-lib'; import * as ns from 'fake-lib'; export const r = [d(), named, ns.named];" },
      'x.ts',
      registry,
    );
    expect(mod.r).toEqual(['default!', 42, 42]);
  });

  it('caches modules so shared state is a singleton within one evaluation', () => {
    const mod = evaluate(
      {
        'entry.ts': "import { bump } from './counter'; import './side'; export const n = bump();",
        'side.ts': "import { bump } from './counter'; bump();",
        'counter.ts': 'let c = 0; export function bump() { return ++c; }',
      },
      'entry.ts',
      registry,
    );
    expect(mod.n).toBe(2);
  });

  it('throws a helpful ModuleNotFoundError listing what is available', () => {
    try {
      evaluate({ 'a.ts': "import x from 'lodash'; export default x;" }, 'a.ts', registry);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ModuleNotFoundError);
      const err = e as ModuleNotFoundError;
      expect(err.specifier).toBe('lodash');
      expect(err.from).toBe('a.ts');
      expect(err.message).toContain('fake-lib');
      expect(err.message).toContain('a.ts');
    }
  });

  it('propagates CompileError from any file', () => {
    expect(() => evaluate({ 'a.ts': "import './b'; export {}", 'b.ts': 'const = 1;' }, 'a.ts', registry)).toThrow(CompileError);
  });

  it('throws if the entry file does not exist', () => {
    expect(() => evaluate({ 'a.ts': 'export {}' }, 'App.tsx', registry)).toThrow(/entry/i);
  });

  it('runs real React through the registry (default and named imports)', () => {
    const mod = evaluate(
      { 'App.tsx': "import React, { useState } from 'react'; export default function App() { const [n] = useState(1); return <p>{n}</p>; } export const version = React.version;" },
      'App.tsx',
      baseRegistry,
    );
    expect(typeof mod.default).toBe('function');
    expect(String(mod.version)).toMatch(/^19\./);
  });
});
