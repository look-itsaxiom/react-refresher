export type HttpHeaders = Record<string, string>;
export type FakeRequest = { url: string; headers?: HttpHeaders };
export type FakeResponse = { status: number; headers: HttpHeaders; body: string };
export type Origin = (request: FakeRequest) => FakeResponse;
export type CacheStatus = 'HIT' | 'MISS' | 'STALE' | 'REVALIDATED';
export type FetchResult = { response: FakeResponse; cacheStatus: CacheStatus };
export type Clock = () => number;

type Directives = Record<string, string | true>;

type CacheEntry = {
  response: FakeResponse;
  storedAt: number;
  varyHeaders: HttpHeaders;
};

function parseCacheControl(header: string | undefined): Directives {
  const directives: Directives = {};
  if (!header) return directives;
  for (const part of header.split(',')) {
    const [rawName, rawValue] = part.split('=');
    const name = (rawName ?? '').trim().toLowerCase();
    if (!name) continue;
    directives[name] = rawValue === undefined ? true : rawValue.trim().replace(/^"|"$/g, '');
  }
  return directives;
}

function seconds(value: string | true | undefined): number {
  return typeof value === 'string' ? Number(value) : 0;
}

function varyNames(response: FakeResponse): string[] {
  const raw = response.headers['Vary'];
  if (!raw) return [];
  return raw.split(',').map((name) => name.trim());
}

function varySignature(names: string[], headers: HttpHeaders | undefined): string {
  return names.map((name) => `${name.toLowerCase()}=${headers?.[name] ?? ''}`).join('&');
}

/**
 * A simplified shared (CDN-like) HTTP cache. `clock` is injected so tests can
 * control time exactly; `fetch` is synchronous because `origin` is a plain
 * function, not a real network call.
 *
 * Note on stale-while-revalidate: a real cache returns the stale response to
 * the caller immediately and revalidates afterwards, off to the side. This
 * model collapses that into one synchronous call for testability -- the
 * caller still gets the *old* response back (cacheStatus 'STALE'), but the
 * revalidation against `origin` has already happened by the time `fetch`
 * returns, so the *next* call sees the refreshed entry.
 */
export function createHttpCache(clock: Clock) {
  const store = new Map<string, CacheEntry[]>();

  function lookup(request: FakeRequest): CacheEntry | undefined {
    const entries = store.get(request.url);
    if (!entries) return undefined;
    return entries.find((entry) => {
      const names = varyNames(entry.response);
      if (names.includes('*')) return false; // Vary: * can never be reused
      return varySignature(names, entry.varyHeaders) === varySignature(names, request.headers);
    });
  }

  function save(request: FakeRequest, response: FakeResponse, storedAt: number) {
    const directives = parseCacheControl(response.headers['Cache-Control']);
    if (directives['no-store']) return; // never persist a no-store response
    const names = varyNames(response);
    const varyHeaders: HttpHeaders = {};
    for (const name of names) varyHeaders[name] = request.headers?.[name] ?? '';
    const signature = varySignature(names, varyHeaders);
    const remaining = (store.get(request.url) ?? []).filter(
      (entry) => varySignature(varyNames(entry.response), entry.varyHeaders) !== signature,
    );
    remaining.push({ response, storedAt, varyHeaders });
    store.set(request.url, remaining);
  }

  function fetch(request: FakeRequest, origin: Origin): FetchResult {
    const now = clock();
    const entry = lookup(request);

    if (!entry) {
      const response = origin(request);
      save(request, response, now);
      return { response, cacheStatus: 'MISS' };
    }

    const directives = parseCacheControl(entry.response.headers['Cache-Control']);
    const immutable = directives['immutable'] === true;
    const noCache = directives['no-cache'] === true;
    const age = now - entry.storedAt;
    // A shared cache prefers s-maxage over max-age when both are present.
    const freshMs = seconds(directives['s-maxage'] ?? directives['max-age']) * 1000;
    const swrMs = seconds(directives['stale-while-revalidate']) * 1000;
    const staleIfErrorMs = seconds(directives['stale-if-error']) * 1000;

    if (immutable || (!noCache && age < freshMs)) {
      return { response: entry.response, cacheStatus: 'HIT' };
    }

    const withinSwr = !noCache && age < freshMs + swrMs;
    const revalidationHeaders: HttpHeaders = { ...request.headers };
    if (entry.response.headers['ETag']) {
      revalidationHeaders['If-None-Match'] = entry.response.headers['ETag'];
    }

    let originResponse: FakeResponse;
    try {
      originResponse = origin({ ...request, headers: revalidationHeaders });
    } catch {
      originResponse = { status: 599, headers: {}, body: '' };
    }

    if (originResponse.status >= 500) {
      if (age < freshMs + staleIfErrorMs) {
        return { response: entry.response, cacheStatus: 'STALE' };
      }
      return { response: originResponse, cacheStatus: 'MISS' };
    }

    if (originResponse.status === 304) {
      const refreshed: FakeResponse = {
        ...entry.response,
        headers: { ...entry.response.headers, ...originResponse.headers },
      };
      save(request, refreshed, now);
      return { response: refreshed, cacheStatus: withinSwr ? 'STALE' : 'REVALIDATED' };
    }

    save(request, originResponse, now);
    return withinSwr
      ? { response: entry.response, cacheStatus: 'STALE' }
      : { response: originResponse, cacheStatus: 'MISS' };
  }

  return { fetch };
}

export default function App() {
  const clock = () => Date.now();
  const cache = createHttpCache(clock);
  const origin: Origin = () => ({
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30', ETag: '"v1"' },
    body: 'hello from origin',
  });
  const first = cache.fetch({ url: '/greeting' }, origin);
  const second = cache.fetch({ url: '/greeting' }, origin);

  return (
    <div>
      <p>First fetch: {first.cacheStatus}</p>
      <p>Second fetch: {second.cacheStatus}</p>
      <p>Body: {second.response.body}</p>
    </div>
  );
}
