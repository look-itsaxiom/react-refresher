import { describe, it, expect } from 'vitest';
import { compileFile, CompileError } from './compile';

describe('compileFile', () => {
  it('strips types and lowers JSX to the automatic dev runtime as CommonJS', () => {
    const out = compileFile('App.tsx', `
      import { useState } from 'react';
      export default function App(): JSX.Element { const [n] = useState<number>(0); return <p>{n}</p>; }
    `);
    expect(out).toContain("require('react')");
    expect(out).toContain('react/jsx-dev-runtime');
    expect(out).toContain('exports.default');
    expect(out).not.toContain('useState<number>');
  });

  it('throws CompileError with filename and location on a syntax error', () => {
    try {
      compileFile('Broken.tsx', 'export default function () { return <p>oops</p>;');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CompileError);
      const err = e as CompileError;
      expect(err.filename).toBe('Broken.tsx');
      expect(err.line).toBeGreaterThan(0);
      expect(err.message).toMatch(/Broken\.tsx/);
    }
  });
});
