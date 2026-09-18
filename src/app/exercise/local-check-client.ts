export type LocalTestOutcome = { name: string; status: 'pass' | 'fail' | 'skip'; output: string };
export type LocalCheckResponse = {
  ok: boolean;
  tests: LocalTestOutcome[];
  raw: string;
  durationMs: number;
  error?: 'bad-request' | 'forbidden' | 'not-found' | 'go-not-found' | 'timeout' | 'spawn-failed' | 'no-dev-server';
};

/** Calls the dev server's go test runner. Resolves with `error: 'no-dev-server'` in static builds. */
export async function runLocalCheck(dir: string, fetchImpl: typeof fetch = fetch): Promise<LocalCheckResponse> {
  let res: Response;
  try {
    res = await fetchImpl('/__local-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir }) });
  } catch {
    return { ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' };
  }
  if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) {
    return { ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' };
  }
  if (!res.ok) return { ok: false, tests: [], raw: await res.text(), durationMs: 0, error: res.status === 404 ? 'not-found' : 'bad-request' };
  return (await res.json()) as LocalCheckResponse;
}

/** All expected tests present and passing. */
export function allExpectedPassed(response: LocalCheckResponse, expectedTests: string[]): boolean {
  if (!response.ok) return false;
  const passed = new Set(response.tests.filter((t) => t.status === 'pass').map((t) => t.name));
  return expectedTests.every((name) => passed.has(name));
}
