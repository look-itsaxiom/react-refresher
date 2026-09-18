import { spawn as nodeSpawn, spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

// This file must not import from src/ (it is compiled by tsconfig.node.json).

export const EXERCISES_DIR = 'exercises-local';
export const DEFAULT_TIMEOUT_MS = 60_000;

export type TestStatus = 'pass' | 'fail' | 'skip';
export type TestOutcome = { name: string; status: TestStatus; output: string };
export type LocalCheckError = 'go-not-found' | 'timeout' | 'spawn-failed';
export type LocalCheckResponse = { ok: boolean; tests: TestOutcome[]; raw: string; durationMs: number; error?: LocalCheckError };

export type SpawnResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean };
export type Spawner = (cwd: string, args: string[], timeoutMs: number) => Promise<SpawnResult>;

export type HandlerDeps = {
  root: string;
  spawn: Spawner;
  exists: (dir: string) => Promise<boolean>;
  timeoutMs?: number;
};

export type HandlerResult = { status: number; body: string };

/** Resolve `dir` strictly inside `<root>/exercises-local`. Returns null for anything suspicious. */
export function resolveExerciseDir(root: string, dir: string): string | null {
  if (typeof dir !== 'string' || dir.length === 0 || dir.length > 200) return null;
  if (dir.includes('..') || dir.includes('\0')) return null;
  if (isAbsolute(dir) || /^[A-Za-z]:/.test(dir) || dir.startsWith('/') || dir.startsWith('\\')) return null;
  if (!/^[A-Za-z0-9._-]+(?:[\\/][A-Za-z0-9._-]+)*$/.test(dir)) return null;
  const base = resolve(root, EXERCISES_DIR);
  const full = normalize(resolve(base, dir));
  if (full !== base && !full.startsWith(base + sep)) return null;
  return full;
}

/** Parse `go test -json` output into per-test outcomes (package-level events are ignored). */
export function parseGoTestJson(raw: string): TestOutcome[] {
  const byName = new Map<string, TestOutcome>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let ev: { Action?: string; Test?: string; Output?: string };
    try { ev = JSON.parse(line) as typeof ev; } catch { continue; }
    if (!ev.Test) continue;
    const t = byName.get(ev.Test) ?? { name: ev.Test, status: 'fail' as TestStatus, output: '' };
    if (ev.Action === 'output' && ev.Output) t.output += ev.Output;
    else if (ev.Action === 'pass') t.status = 'pass';
    else if (ev.Action === 'fail') t.status = 'fail';
    else if (ev.Action === 'skip') t.status = 'skip';
    byName.set(ev.Test, t);
  }
  return [...byName.values()];
}

function isSameOriginAsHost(origin: string, host: string): boolean {
  return origin === `http://${host}` || origin === `https://${host}`;
}

export function createLocalCheckHandler(deps: HandlerDeps) {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return async (method: string, body: string, origin?: string, host?: string): Promise<HandlerResult> => {
    if (method !== 'POST') return { status: 405, body: 'Method not allowed' };
    if (!origin) return { status: 403, body: 'Forbidden: missing Origin' };
    if (host && !isSameOriginAsHost(origin, host)) return { status: 403, body: 'Forbidden' };
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { return { status: 400, body: 'Malformed JSON' }; }
    const dir = typeof parsed === 'object' && parsed !== null ? (parsed as { dir?: unknown }).dir : undefined;
    const tags = typeof parsed === 'object' && parsed !== null ? (parsed as { tags?: unknown }).tags : undefined;
    const full = typeof dir === 'string' ? resolveExerciseDir(deps.root, dir) : null;
    if (!full) return { status: 400, body: 'Invalid dir' };
    if (typeof tags !== 'undefined' && (typeof tags !== 'string' || !/^[A-Za-z0-9_,]*$/.test(tags))) return { status: 400, body: 'Invalid tags' };
    if (!(await deps.exists(full))) return { status: 404, body: 'No such exercise folder' };

    const args = ['test', '-json', '-count=1', ...(tags ? ['-tags', tags] : []), './...'];
    const started = Date.now();
    let result: SpawnResult;
    try {
      result = await deps.spawn(full, args, timeoutMs);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      const error: LocalCheckError = code === 'ENOENT' ? 'go-not-found' : 'spawn-failed';
      const res: LocalCheckResponse = { ok: false, tests: [], raw: e instanceof Error ? e.message : String(e), durationMs: Date.now() - started, error };
      return { status: 200, body: JSON.stringify(res) };
    }
    const tests = parseGoTestJson(result.stdout);
    const res: LocalCheckResponse = {
      ok: !result.timedOut && result.code === 0 && tests.every((t) => t.status !== 'fail'),
      tests,
      raw: result.stdout + (result.stderr ? `\n${result.stderr}` : ''),
      durationMs: Date.now() - started,
      ...(result.timedOut ? { error: 'timeout' as const } : {}),
    };
    return { status: 200, body: JSON.stringify(res) };
  };
}

/**
 * Create a Spawner that runs `command` and, on timeout, kills the whole process tree
 * rather than just the immediate child. `go test` execs a separate test binary as a
 * child of `go`, so a plain `child.kill()` can leave that test binary running on Windows.
 */
export function createSpawner(command: string): Spawner {
  return (cwd, args, timeoutMs) =>
    new Promise((resolvePromise, reject) => {
      const isWin = process.platform === 'win32';
      const child = nodeSpawn(command, args, {
        cwd,
        env: { ...process.env },
        windowsHide: true,
        detached: !isWin,
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (isWin) {
          if (typeof child.pid === 'number') {
            spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
          }
        } else {
          try {
            if (typeof child.pid === 'number') process.kill(-child.pid, 'SIGKILL');
          } catch {
            child.kill('SIGKILL');
          }
        }
      }, timeoutMs);
      child.stdout.setEncoding('utf8').on('data', (d: string) => { stdout += d; });
      child.stderr.setEncoding('utf8').on('data', (d: string) => { stderr += d; });
      child.on('error', (e) => { clearTimeout(timer); reject(e); });
      child.on('close', (code) => { clearTimeout(timer); resolvePromise({ code, stdout, stderr, timedOut }); });
    });
}

export const goSpawner: Spawner = createSpawner('go');

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; if (data.length > 10_000) req.destroy(new Error('Body too large')); });
    req.on('end', () => resolvePromise(data));
    req.on('error', reject);
  });
}

export type LocalCheckHandler = (method: string, body: string, origin?: string, host?: string) => Promise<HandlerResult>;

/**
 * Connect-style middleware around a `createLocalCheckHandler` handler. Every response it
 * emits (200 and every 4xx/405) carries `X-Local-Check: 1`, so the app-side client can tell
 * "this is our dev server responding" apart from a static host's catch-all 404 page (which
 * would otherwise be misread the same way).
 */
export function createLocalCheckMiddleware(handler: LocalCheckHandler) {
  return (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
    void (async () => {
      try {
        const body = req.method === 'POST' ? await readBody(req) : '';
        const result = await handler(req.method ?? 'GET', body, req.headers.origin, req.headers.host);
        res.statusCode = result.status;
        res.setHeader('X-Local-Check', '1');
        if (result.status === 200) res.setHeader('Content-Type', 'application/json');
        res.end(result.body);
      } catch (e) {
        next(e);
      }
    })();
  };
}

export function localCheckPlugin(): Plugin {
  return {
    name: 'react-refresher-local-check',
    configureServer(server) {
      const handler = createLocalCheckHandler({
        root: server.config.root,
        spawn: goSpawner,
        exists: async (dir) => { try { await access(dir); return true; } catch { return false; } },
      });
      server.middlewares.use('/__local-check', createLocalCheckMiddleware(handler));
    },
  };
}
