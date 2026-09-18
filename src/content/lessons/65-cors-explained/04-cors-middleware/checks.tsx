import type { Check } from '../../../types';

type CorsConfig = {
  allowedOrigins: string[];
  credentials: boolean;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
};
type MiddlewareRequest = { method: string; origin?: string; headers: Record<string, string> };
type MiddlewareResponse = { status: number; headers: Record<string, string> };
type Mod = { corsMiddleware: (config: CorsConfig) => (req: MiddlewareRequest) => MiddlewareResponse | undefined };

function header(res: MiddlewareResponse | undefined, name: string): string | undefined {
  if (!res) return undefined;
  const key = Object.keys(res.headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : res.headers[key];
}

const credentialedConfig: CorsConfig = {
  allowedOrigins: ['https://app.example.com'],
  credentials: true,
  allowedMethods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['content-type', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
  maxAge: 3600,
};

const openConfig: CorsConfig = {
  allowedOrigins: ['*'],
  credentials: false,
  allowedMethods: ['GET'],
  allowedHeaders: [],
};

export const checks: Check[] = [
  {
    name: 'a request with no Origin header passes through untouched',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(credentialedConfig);
      expect(mw({ method: 'GET', headers: {} })).to.equal(undefined);
    },
  },
  {
    name: 'a cross-origin request from an origin not on the allowlist passes through (both preflight and actual)',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(credentialedConfig);
      expect(
        mw({
          method: 'OPTIONS',
          origin: 'https://evil.example.com',
          headers: { 'access-control-request-method': 'GET' },
        }),
        'preflight',
      ).to.equal(undefined);
      expect(mw({ method: 'GET', origin: 'https://evil.example.com', headers: {} }), 'actual').to.equal(undefined);
    },
  },
  {
    name: 'a real preflight (OPTIONS with access-control-request-method) from an allowed origin returns 204 with echoed origin, methods, headers, max-age, and Vary',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(credentialedConfig);
      const res = mw({
        method: 'OPTIONS',
        origin: 'https://app.example.com',
        headers: { 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type' },
      });
      expect(res, 'expected a response').to.exist;
      expect(res!.status).to.equal(204);
      expect(header(res, 'access-control-allow-origin')).to.equal('https://app.example.com');
      expect(header(res, 'access-control-allow-methods')).to.equal('GET, POST, PUT');
      expect(header(res, 'access-control-allow-headers')).to.equal('content-type, x-request-id');
      expect(header(res, 'access-control-max-age')).to.equal('3600');
      expect(header(res, 'vary')).to.equal('Origin');
      expect(header(res, 'access-control-allow-credentials')).to.equal('true');
    },
  },
  {
    name: 'a bare OPTIONS request with no access-control-request-method is not a preflight and passes through',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(credentialedConfig);
      const res = mw({ method: 'OPTIONS', origin: 'https://app.example.com', headers: {} });
      expect(res).to.equal(undefined);
    },
  },
  {
    name: 'an actual (non-preflight) request from an allowed origin gets status 200, echoed origin, credentials, Vary, and expose-headers, but no preflight-only headers',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(credentialedConfig);
      const res = mw({ method: 'GET', origin: 'https://app.example.com', headers: {} });
      expect(res, 'expected a response').to.exist;
      expect(res!.status).to.equal(200);
      expect(header(res, 'access-control-allow-origin')).to.equal('https://app.example.com');
      expect(header(res, 'access-control-allow-credentials')).to.equal('true');
      expect(header(res, 'vary')).to.equal('Origin');
      expect(header(res, 'access-control-expose-headers')).to.equal('x-request-id');
      expect(header(res, 'access-control-allow-methods'), 'methods is preflight-only').to.equal(undefined);
      expect(header(res, 'access-control-allow-headers'), 'headers is preflight-only').to.equal(undefined);
      expect(header(res, 'access-control-max-age'), 'max-age is preflight-only').to.equal(undefined);
    },
  },
  {
    name: 'a wildcard allowlist with credentials disabled responds with a literal "*" origin and omits Access-Control-Allow-Credentials',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(openConfig);
      const res = mw({ method: 'GET', origin: 'https://anyone.example.com', headers: {} });
      expect(res, 'expected a response').to.exist;
      expect(header(res, 'access-control-allow-origin')).to.equal('*');
      expect(header(res, 'access-control-allow-credentials')).to.equal(undefined);
    },
  },
  {
    name: 'a preflight defaults Access-Control-Max-Age to 600 when config.maxAge is omitted',
    run: async ({ mod, expect }) => {
      const { corsMiddleware } = mod as unknown as Mod;
      const mw = corsMiddleware(openConfig);
      const res = mw({
        method: 'OPTIONS',
        origin: 'https://anyone.example.com',
        headers: { 'access-control-request-method': 'GET' },
      });
      expect(header(res, 'access-control-max-age')).to.equal('600');
    },
  },
];
