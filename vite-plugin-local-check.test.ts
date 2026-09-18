import { describe, it, expect } from 'vitest';
import { createLocalCheckHandler, createSpawner, parseGoTestJson, resolveExerciseDir, type SpawnResult } from './vite-plugin-local-check.ts';

const root = 'C:/repo';

describe('resolveExerciseDir', () => {
  it('accepts simple relative folders and rejects traversal and absolute paths', () => {
    expect(resolveExerciseDir(root, '102-go/02-tests')).toMatch(/exercises-local[\\/]102-go[\\/]02-tests$/);
    for (const bad of ['../x', 'a/../../x', '/etc', 'C:/x', '\\\\server\\share', 'a\\..\\b', '']) {
      expect(resolveExerciseDir(root, bad), bad).toBeNull();
    }
  });
});

describe('parseGoTestJson', () => {
  it('collects pass/fail/skip per test with its output', () => {
    const raw = [
      '{"Action":"run","Test":"TestAdd"}',
      '{"Action":"output","Test":"TestAdd","Output":"=== RUN   TestAdd\\n"}',
      '{"Action":"output","Test":"TestAdd","Output":"    add_test.go:9: want 3 got 2\\n"}',
      '{"Action":"fail","Test":"TestAdd","Elapsed":0.01}',
      '{"Action":"run","Test":"TestSub"}',
      '{"Action":"pass","Test":"TestSub","Elapsed":0}',
      '{"Action":"skip","Test":"TestSkip"}',
      '{"Action":"fail","Elapsed":0.02}',
      'not json at all',
    ].join('\n');
    expect(parseGoTestJson(raw)).toEqual([
      { name: 'TestAdd', status: 'fail', output: '=== RUN   TestAdd\n    add_test.go:9: want 3 got 2\n' },
      { name: 'TestSub', status: 'pass', output: '' },
      { name: 'TestSkip', status: 'skip', output: '' },
    ]);
  });
});

describe('createLocalCheckHandler', () => {
  const okSpawn = async (): Promise<SpawnResult> => ({ code: 1, stdout: '{"Action":"pass","Test":"TestA"}\n{"Action":"fail","Test":"TestB"}\n', stderr: '', timedOut: false });

  it('rejects non-POST, bad origin, malformed body, and traversal', async () => {
    const h = createLocalCheckHandler({ root, spawn: okSpawn, exists: async () => true });
    expect((await h('GET', '', undefined, 'localhost:5180')).status).toBe(405);
    expect((await h('POST', '{"dir":"a/b"}', 'http://evil.test', 'localhost:5180')).status).toBe(403);
    expect((await h('POST', 'nope', undefined, 'localhost:5180')).status).toBe(400);
    expect((await h('POST', '{"dir":"../x"}', undefined, 'localhost:5180')).status).toBe(400);
  });

  it('404s when the folder is missing and 200s with parsed tests otherwise', async () => {
    const missing = createLocalCheckHandler({ root, spawn: okSpawn, exists: async () => false });
    expect((await missing('POST', '{"dir":"a/b"}', undefined, 'localhost:5180')).status).toBe(404);
    const h = createLocalCheckHandler({ root, spawn: okSpawn, exists: async () => true });
    const r = await h('POST', '{"dir":"a/b"}', 'http://localhost:5180', 'localhost:5180');
    expect(r.status).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.ok).toBe(false);
    expect(body.tests).toEqual([{ name: 'TestA', status: 'pass', output: '' }, { name: 'TestB', status: 'fail', output: '' }]);
  });

  it('maps ENOENT to go-not-found and timeouts to timeout', async () => {
    const enoent = createLocalCheckHandler({ root, spawn: async () => { throw Object.assign(new Error('spawn go ENOENT'), { code: 'ENOENT' }); }, exists: async () => true });
    expect(JSON.parse((await enoent('POST', '{"dir":"a/b"}', undefined, 'h')).body).error).toBe('go-not-found');
    const slow = createLocalCheckHandler({ root, spawn: async () => ({ code: null, stdout: '', stderr: '', timedOut: true }), exists: async () => true });
    expect(JSON.parse((await slow('POST', '{"dir":"a/b"}', undefined, 'h')).body).error).toBe('timeout');
  });
});

describe('createSpawner', () => {
  it('kills the real process tree on timeout without hanging or rejecting', async () => {
    const started = Date.now();
    const result = await createSpawner(process.execPath)(process.cwd(), ['-e', 'setTimeout(() => {}, 30000)'], 300);
    expect(result.timedOut).toBe(true);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
