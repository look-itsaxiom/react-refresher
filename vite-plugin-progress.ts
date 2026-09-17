import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

// Duplicated (not imported) from src/app/progress/types.ts so this file stays in the node tsconfig project.
type Progress = {
  version: 1;
  steps: Record<string, unknown>;
  code: Record<string, unknown>;
  quiz: Record<string, unknown>;
  lastVisited?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isProgress(x: unknown): x is Progress {
  return (
    isRecord(x) &&
    x.version === 1 &&
    isRecord(x.steps) &&
    isRecord(x.code) &&
    isRecord(x.quiz) &&
    (x.lastVisited === undefined || typeof x.lastVisited === 'string')
  );
}

const EMPTY = '{\n  "version": 1,\n  "steps": {},\n  "code": {},\n  "quiz": {}\n}\n';

export type ProgressIo = {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
};

export type HandlerResult = { status: number; body: string };

export function createProgressHandler(io: ProgressIo) {
  return async (method: string, body: string): Promise<HandlerResult> => {
    if (method === 'GET') {
      const text = await io.read();
      return { status: 200, body: text ?? EMPTY };
    }
    if (method === 'PUT') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return { status: 400, body: 'Malformed JSON' };
      }
      if (!isProgress(parsed)) return { status: 400, body: 'Invalid progress shape' };
      await io.write(`${JSON.stringify(parsed, null, 2)}\n`);
      return { status: 204, body: '' };
    }
    return { status: 405, body: 'Method not allowed' };
  };
}

function fileIo(path: string): ProgressIo {
  return {
    async read() {
      try {
        return await readFile(path, 'utf8');
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
    },
    async write(text) {
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      await writeFile(tmp, text, 'utf8');
      await rename(tmp, path); // atomic on the same volume
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; });
    req.on('end', () => resolvePromise(data));
    req.on('error', reject);
  });
}

export function progressPlugin(options: { file?: string } = {}): Plugin {
  const relative = options.file ?? 'progress/progress.json';
  return {
    name: 'react-refresher-progress',
    configureServer(server) {
      const handler = createProgressHandler(fileIo(resolve(server.config.root, relative)));
      server.middlewares.use('/__progress', (req: IncomingMessage, res: ServerResponse, next) => {
        void (async () => {
          try {
            const body = req.method === 'PUT' ? await readBody(req) : '';
            const result = await handler(req.method ?? 'GET', body);
            res.statusCode = result.status;
            if (result.status === 200) res.setHeader('Content-Type', 'application/json');
            res.end(result.body);
          } catch (e) {
            next(e);
          }
        })();
      });
    },
  };
}
