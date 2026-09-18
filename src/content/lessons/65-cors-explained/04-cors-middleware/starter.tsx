export type CorsConfig = {
  allowedOrigins: string[];
  credentials: boolean;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
};

export type MiddlewareRequest = {
  method: string;
  origin?: string;
  headers: Record<string, string>;
};

export type MiddlewareResponse = { status: number; headers: Record<string, string> };

export function corsMiddleware(config: CorsConfig): (req: MiddlewareRequest) => MiddlewareResponse | undefined {
  // TODO: return a function that answers preflights, adds headers to allowed actual requests,
  // and passes through (returns undefined) for non-CORS or disallowed-origin requests.
  return () => undefined;
}

const exampleConfig: CorsConfig = {
  allowedOrigins: ['https://app.example.com'],
  credentials: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['content-type', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
  maxAge: 600,
};

const exampleRequests: { label: string; req: MiddlewareRequest }[] = [
  {
    label: 'preflight for PUT from allowed origin',
    req: {
      method: 'OPTIONS',
      origin: 'https://app.example.com',
      headers: { 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type' },
    },
  },
  {
    label: 'actual GET from allowed origin',
    req: { method: 'GET', origin: 'https://app.example.com', headers: {} },
  },
  {
    label: 'actual GET from a disallowed origin',
    req: { method: 'GET', origin: 'https://evil.example.com', headers: {} },
  },
];

export default function App() {
  const middleware = corsMiddleware(exampleConfig);
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 16 }}>
      <h3>corsMiddleware</h3>
      <table>
        <tbody>
          {exampleRequests.map(({ label, req }) => (
            <tr key={label}>
              <td>{label}</td>
              <td data-testid="middleware-result">{JSON.stringify(middleware(req)) ?? 'undefined'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
