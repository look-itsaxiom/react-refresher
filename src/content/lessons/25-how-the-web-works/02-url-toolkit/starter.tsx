export function sameOrigin(a: string, b: string): boolean {
  // TODO: compare origins, not raw strings.
  return a === b;
}

export function resolve(base: string, relative: string): string {
  // TODO: resolve `relative` against `base` and return an absolute URL string.
  return relative;
}

export function withQuery(url: string, params: Record<string, string | number | boolean | undefined>): string {
  // TODO: merge `params` into url's existing query string, sorted by key, dropping any key
  // whose value is `undefined`. Preserve the hash.
  return url;
}

const sameOriginExamples: Array<[string, string]> = [
  ['https://app.example.com:443/dashboard', 'https://app.example.com/settings'],
  ['https://app.example.com', 'https://api.example.com'],
  ['https://example.com', 'http://example.com'],
];

const resolveExamples: Array<[string, string]> = [
  ['https://example.com/docs/guide', '../api/users'],
  ['https://example.com/docs/', './guide'],
  ['https://example.com/docs/guide', 'https://other.com/x'],
];

const withQueryExamples: Array<[string, Record<string, string | number | boolean | undefined>]> = [
  ['https://example.com/search?q=react&sort=asc#results', { sort: 'desc', page: 2 }],
  ['https://example.com/search?q=react&sort=asc', { sort: undefined }],
];

export default function App() {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 16 }}>
      <h3>sameOrigin</h3>
      <table>
        <tbody>
          {sameOriginExamples.map(([a, b]) => (
            <tr key={a + b}>
              <td>{a}</td>
              <td>{b}</td>
              <td data-testid="same-origin-result">{String(sameOrigin(a, b))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>resolve</h3>
      <table>
        <tbody>
          {resolveExamples.map(([base, rel]) => (
            <tr key={base + rel}>
              <td>{base}</td>
              <td>{rel}</td>
              <td data-testid="resolve-result">{resolve(base, rel)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>withQuery</h3>
      <table>
        <tbody>
          {withQueryExamples.map(([url, params], i) => (
            <tr key={i}>
              <td>{url}</td>
              <td>{JSON.stringify(params)}</td>
              <td data-testid="with-query-result">{withQuery(url, params)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
