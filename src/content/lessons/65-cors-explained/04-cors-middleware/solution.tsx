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

function resolveOrigin(config: CorsConfig, origin: string): { allowed: boolean; value: string } {
  if (config.allowedOrigins.includes(origin)) return { allowed: true, value: origin };
  if (!config.credentials && config.allowedOrigins.includes('*')) return { allowed: true, value: '*' };
  return { allowed: false, value: '' };
}

export function corsMiddleware(config: CorsConfig): (req: MiddlewareRequest) => MiddlewareResponse | undefined {
  return (req) => {
    if (!req.origin) return undefined;

    const { allowed, value } = resolveOrigin(config, req.origin);
    if (!allowed) return undefined;

    const isPreflight = req.method === 'OPTIONS' && 'access-control-request-method' in req.headers;
    if (req.method === 'OPTIONS' && !isPreflight) return undefined;

    if (isPreflight) {
      const headers: Record<string, string> = {
        'access-control-allow-origin': value,
        'access-control-allow-methods': config.allowedMethods.join(', '),
        'access-control-allow-headers': config.allowedHeaders.join(', '),
        'access-control-max-age': String(config.maxAge ?? 600),
        vary: 'Origin',
      };
      if (config.credentials) headers['access-control-allow-credentials'] = 'true';
      return { status: 204, headers };
    }

    const headers: Record<string, string> = {
      'access-control-allow-origin': value,
      vary: 'Origin',
    };
    if (config.credentials) headers['access-control-allow-credentials'] = 'true';
    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
      headers['access-control-expose-headers'] = config.exposedHeaders.join(', ');
    }
    return { status: 200, headers };
  };
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
