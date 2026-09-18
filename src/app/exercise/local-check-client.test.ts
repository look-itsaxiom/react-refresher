import { describe, it, expect, vi } from 'vitest';
import { runLocalCheck } from './local-check-client';

function fakeResponse(status: number, headers: Record<string, string>, body: string): Response {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

describe('runLocalCheck', () => {
  it('returns no-dev-server when fetch throws (no server at all)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network error'));
    expect(await runLocalCheck('_smoke', fetchImpl)).toEqual({ ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' });
  });

  it('returns no-dev-server when the response has no X-Local-Check header, even on 200 (static host fallback page)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, {}, '<html>not our server</html>'));
    const r = await runLocalCheck('_smoke', fetchImpl);
    expect(r.error).toBe('no-dev-server');
  });

  it('returns no-dev-server when the response has no X-Local-Check header on a 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(404, {}, 'not found'));
    const r = await runLocalCheck('_smoke', fetchImpl);
    expect(r.error).toBe('no-dev-server');
  });

  it('parses the JSON body when the header is present on a 200', async () => {
    const payload = { ok: true, tests: [{ name: 'TestAdd', status: 'pass', output: '' }], raw: '', durationMs: 5 };
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, { 'x-local-check': '1', 'content-type': 'application/json' }, JSON.stringify(payload)));
    expect(await runLocalCheck('_smoke', fetchImpl)).toEqual(payload);
  });

  it('maps a 404 with the header to not-found', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(404, { 'x-local-check': '1' }, 'No such exercise folder'));
    const r = await runLocalCheck('_smoke', fetchImpl);
    expect(r).toEqual({ ok: false, tests: [], raw: 'No such exercise folder', durationMs: 0, error: 'not-found' });
  });

  it('maps a 403 with the header to forbidden', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(403, { 'x-local-check': '1' }, 'Forbidden'));
    const r = await runLocalCheck('_smoke', fetchImpl);
    expect(r).toEqual({ ok: false, tests: [], raw: 'Forbidden', durationMs: 0, error: 'forbidden' });
  });

  it('maps any other non-OK status with the header to bad-request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(400, { 'x-local-check': '1' }, 'Invalid dir'));
    const r = await runLocalCheck('_smoke', fetchImpl);
    expect(r).toEqual({ ok: false, tests: [], raw: 'Invalid dir', durationMs: 0, error: 'bad-request' });
  });

  it('returns no-dev-server when a 200 with the header has a non-JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, { 'x-local-check': '1' }, 'not json'));
    const r = await runLocalCheck('_smoke', fetchImpl);
    expect(r.error).toBe('no-dev-server');
  });
});
