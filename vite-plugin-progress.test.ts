import { describe, it, expect } from 'vitest';
import { createProgressHandler } from './vite-plugin-progress';

function fakeIo(initial: string | null) {
  let file = initial;
  return {
    io: {
      read: async () => file,
      write: async (text: string) => { file = text; },
    },
    current: () => file,
  };
}

describe('progress handler', () => {
  it('GET returns the empty shape when no file exists', async () => {
    const { io } = fakeIo(null);
    const res = await createProgressHandler(io)('GET', '');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ version: 1, steps: {}, code: {}, quiz: {} });
  });

  it('GET returns the stored file', async () => {
    const stored = JSON.stringify({ version: 1, steps: { 'a/b': { completedAt: 'x' } }, code: {}, quiz: {} });
    const { io } = fakeIo(stored);
    const res = await createProgressHandler(io)('GET', '');
    expect(JSON.parse(res.body).steps['a/b'].completedAt).toBe('x');
  });

  it('PUT validates and writes pretty JSON', async () => {
    const { io, current } = fakeIo(null);
    const body = JSON.stringify({ version: 1, steps: {}, code: { k: { 'App.tsx': 'x' } }, quiz: {}, lastVisited: '/x' });
    const res = await createProgressHandler(io)('PUT', body);
    expect(res.status).toBe(204);
    expect(current()).toContain('\n  "version": 1');
    expect(JSON.parse(current() ?? '{}').code.k['App.tsx']).toBe('x');
  });

  it('PUT rejects invalid shapes and malformed JSON', async () => {
    const { io, current } = fakeIo(null);
    const handler = createProgressHandler(io);
    expect((await handler('PUT', '{"version":2}')).status).toBe(400);
    expect((await handler('PUT', 'not json')).status).toBe(400);
    expect(current()).toBeNull();
  });

  it('other methods are 405', async () => {
    const { io } = fakeIo(null);
    expect((await createProgressHandler(io)('DELETE', '')).status).toBe(405);
  });

  it('PUT returns 500 when the write fails', async () => {
    const io = {
      read: async () => null,
      write: async () => { throw new Error('disk full'); },
    };
    const body = JSON.stringify({ version: 1, steps: {}, code: {}, quiz: {} });
    const res = await createProgressHandler(io)('PUT', body);
    expect(res.status).toBe(500);
  });

  it('PUT rejects a cross-origin request without writing', async () => {
    const { io, current } = fakeIo(null);
    const body = JSON.stringify({ version: 1, steps: {}, code: {}, quiz: {} });
    const res = await createProgressHandler(io)('PUT', body, 'http://evil.example', 'localhost:5180');
    expect(res.status).toBe(403);
    expect(current()).toBeNull();
  });

  it('PUT accepts a same-origin request (http or https) and one with no Origin header', async () => {
    const { io: io1 } = fakeIo(null);
    const body = JSON.stringify({ version: 1, steps: {}, code: {}, quiz: {} });
    expect((await createProgressHandler(io1)('PUT', body, 'http://localhost:5180', 'localhost:5180')).status).toBe(204);

    const { io: io2 } = fakeIo(null);
    expect((await createProgressHandler(io2)('PUT', body, 'https://localhost:5180', 'localhost:5180')).status).toBe(204);

    const { io: io3 } = fakeIo(null);
    expect((await createProgressHandler(io3)('PUT', body)).status).toBe(204);
  });
});
