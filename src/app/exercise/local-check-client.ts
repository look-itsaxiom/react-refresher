export type LocalTestOutcome = { name: string; status: 'pass' | 'fail' | 'skip'; output: string };
export type LocalCheckResponse = {
  ok: boolean;
  tests: LocalTestOutcome[];
  raw: string;
  durationMs: number;
  error?: 'bad-request' | 'forbidden' | 'not-found' | 'go-not-found' | 'timeout' | 'spawn-failed' | 'no-dev-server';
};

/**
 * Calls the dev server's go test runner. Resolves with `error: 'no-dev-server'` whenever the
 * response did not come from our middleware — network failure, a static host's catch-all page,
 * or (rarely) a 200 whose body isn't the JSON we expect — rather than trusting status/content-type
 * alone, which a static host's fallback page can spoof (e.g. a 200 HTML shell).
 */
export async function runLocalCheck(dir: string, fetchImpl: typeof fetch = fetch): Promise<LocalCheckResponse> {
  let res: Response;
  try {
    res = await fetchImpl('/__local-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir }) });
  } catch {
    return { ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' };
  }
  if (res.headers.get('x-local-check') !== '1') {
    return { ok: false, tests: [], raw: await res.text().catch(() => ''), durationMs: 0, error: 'no-dev-server' };
  }
  if (res.status === 404) return { ok: false, tests: [], raw: await res.text(), durationMs: 0, error: 'not-found' };
  if (res.status === 403) return { ok: false, tests: [], raw: await res.text(), durationMs: 0, error: 'forbidden' };
  if (!res.ok) return { ok: false, tests: [], raw: await res.text(), durationMs: 0, error: 'bad-request' };
  try {
    return (await res.json()) as LocalCheckResponse;
  } catch {
    return { ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' };
  }
}

/** All expected tests present and passing. */
export function allExpectedPassed(response: LocalCheckResponse, expectedTests: string[]): boolean {
  if (!response.ok) return false;
  const passed = new Set(response.tests.filter((t) => t.status === 'pass').map((t) => t.name));
  return expectedTests.every((name) => passed.has(name));
}
