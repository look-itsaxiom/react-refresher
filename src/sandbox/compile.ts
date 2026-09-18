import { transform } from 'sucrase';

export class CompileError extends Error {
  constructor(
    public readonly filename: string,
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(`${filename}${line ? `:${line}${column !== undefined ? `:${column}` : ''}` : ''}: ${message}`);
    this.name = 'CompileError';
  }
}

type SucraseLikeError = Error & { loc?: { line: number; column: number } };

/** Compile one TS/TSX source file to CommonJS using the automatic (dev) JSX runtime. */
export function compileFile(filename: string, source: string): string {
  try {
    return transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: false,
      filePath: filename,
      disableESTransforms: true,
    }).code;
  } catch (e) {
    const err = e as SucraseLikeError;
    // Sucrase messages look like "Unexpected token (3:14)"; strip the trailing location since we format it ourselves.
    const message = err.message.replace(/\s*\(\d+:\d+\)\s*$/, '');
    let line = err.loc?.line;
    let column = err.loc?.column;
    if (line === undefined) {
      const match = /\((\d+):(\d+)\)\s*$/.exec(err.message);
      if (match) {
        line = Number(match[1]);
        column = Number(match[2]);
      }
    }
    throw new CompileError(filename, message, line, column);
  }
}
