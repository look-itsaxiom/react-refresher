type Loader<T> = () => Promise<T>;
type RequestContext = { memo: <T>(key: string, loader: Loader<T>) => Promise<T> };

export type CacheControlOptions = {
  public?: boolean;
  maxAge: number;
  swr?: number;
  vary?: string[];
};

export type FakeResponse = { headers: Record<string, string> };

/**
 * BUG: `store` lives at module scope, shared by every call to `run`.
 * Two concurrent "requests" end up reading and writing the same cache.
 */
const store = new Map<string, Promise<unknown>>();

export function createRequestCache() {
  return {
    run<T>(fn: (ctx: RequestContext) => Promise<T>): Promise<T> {
      const memo = <V,>(key: string, loader: Loader<V>): Promise<V> => {
        if (!store.has(key)) {
          store.set(key, loader());
        }
        return store.get(key) as Promise<V>;
      };
      return fn({ memo });
    },
  };
}

/** BUG: ignores `options.public` and never sets `Vary`. */
export function withCacheControl<R extends FakeResponse>(response: R, options: CacheControlOptions): R {
  response.headers['Cache-Control'] = `public, max-age=${options.maxAge}`;
  return response;
}

export default function App() {
  return (
    <div>
      <p>Open the console/tests to exercise createRequestCache and withCacheControl.</p>
    </div>
  );
}
