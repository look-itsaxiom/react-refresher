type Loader<T> = () => Promise<T>;
type RequestContext = { memo: <T>(key: string, loader: Loader<T>) => Promise<T> };

export type CacheControlOptions = {
  public?: boolean;
  maxAge: number;
  swr?: number;
  vary?: string[];
};

export type FakeResponse = { headers: Record<string, string> };

export function createRequestCache() {
  return {
    run<T>(fn: (ctx: RequestContext) => Promise<T>): Promise<T> {
      // A fresh store per `run` call -- this is the whole fix. No module-level
      // state, so nothing can leak between two calls, concurrent or not.
      const store = new Map<string, Promise<unknown>>();
      const memo = <V,>(key: string, loader: Loader<V>): Promise<V> => {
        if (!store.has(key)) {
          // Store the promise itself immediately, before awaiting anything,
          // so a second `memo` call for the same key made before the first
          // resolves still reuses it instead of racing a second loader call.
          store.set(key, loader());
        }
        return store.get(key) as Promise<V>;
      };
      return fn({ memo });
    },
  };
}

export function withCacheControl<R extends FakeResponse>(response: R, options: CacheControlOptions): R {
  const directives = [options.public ? 'public' : 'private', `max-age=${options.maxAge}`];
  if (options.swr !== undefined) {
    directives.push(`stale-while-revalidate=${options.swr}`);
  }
  response.headers['Cache-Control'] = directives.join(', ');
  if (options.vary && options.vary.length > 0) {
    response.headers['Vary'] = options.vary.join(', ');
  }
  return response;
}

export default function App() {
  return (
    <div>
      <p>Open the console/tests to exercise createRequestCache and withCacheControl.</p>
    </div>
  );
}
