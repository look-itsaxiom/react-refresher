import { compileFile } from './compile';

export type ModuleRegistry = Record<string, unknown>;
export type UserFiles = Record<string, string>;

export class ModuleNotFoundError extends Error {
  constructor(
    public readonly specifier: string,
    public readonly from: string,
    available: string[],
  ) {
    super(
      `Cannot find module '${specifier}' (imported from ${from}).\n` +
        `This sandbox provides: ${available.join(', ')}.`,
    );
    this.name = 'ModuleNotFoundError';
  }
}

/** Mark a module namespace so Sucrase's interop helpers treat it as ESM (default import -> ns.default). */
export function esm<T extends object>(ns: T): T & { __esModule: true } {
  return { __esModule: true, ...ns } as T & { __esModule: true };
}

const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

function normalize(path: string): string {
  const parts: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function dirname(filename: string): string {
  const i = filename.lastIndexOf('/');
  return i === -1 ? '' : filename.slice(0, i);
}

export function resolveUserFile(from: string, specifier: string, files: UserFiles): string | undefined {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined;
  const base = normalize(`${dirname(from)}/${specifier}`);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (candidate in files) return candidate;
  }
  return undefined;
}

type CjsModule = { exports: Record<string, unknown> };

/**
 * Compile and evaluate `entry` (and everything it imports) as CommonJS.
 * User files resolve relative to the importing file; bare specifiers resolve from `registry`.
 */
export function evaluate(files: UserFiles, entry: string, registry: ModuleRegistry): Record<string, unknown> {
  if (!(entry in files)) throw new Error(`Entry file '${entry}' not found. Files: ${Object.keys(files).join(', ')}`);
  const cache = new Map<string, CjsModule>();
  const available = [...Object.keys(registry), ...Object.keys(files).map((f) => `./${f}`)];

  function load(filename: string): Record<string, unknown> {
    const cached = cache.get(filename);
    if (cached) return cached.exports;
    const module: CjsModule = { exports: {} };
    cache.set(filename, module); // set before executing to support cycles
    const code = compileFile(filename, files[filename] ?? '');
    const require = (specifier: string): unknown => {
      const local = resolveUserFile(filename, specifier, files);
      if (local) return load(local);
      if (specifier in registry) return registry[specifier];
      throw new ModuleNotFoundError(specifier, filename, available);
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- this IS the sandbox's job
    const fn = new Function('require', 'module', 'exports', `${code}\n//# sourceURL=sandbox:///${filename}`);
    fn(require, module, module.exports);
    return module.exports;
  }

  return load(entry);
}
