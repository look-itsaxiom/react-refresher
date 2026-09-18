export type CorsRequest = {
  origin: string;
  targetOrigin: string;
  method: string;
  headers: Record<string, string>;
  credentials: 'include' | 'same-origin' | 'omit';
};

export type CorsResponse = { headers: Record<string, string> };
export type PreflightResponse = { status: number; headers: Record<string, string> };

const SAFELISTED_HEADERS = new Set(['accept', 'accept-language', 'content-language', 'content-type', 'range']);
const SAFELISTED_CONTENT_TYPES = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);
const LENGTH_LIMITED_HEADERS = new Set(['accept', 'accept-language', 'content-language']);

function lookupHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : headers[key];
}

export function classifyRequest(req: CorsRequest): 'same-origin' | 'simple' | 'preflighted' {
  if (req.origin === req.targetOrigin) return 'same-origin';
  if (!['GET', 'HEAD', 'POST'].includes(req.method.toUpperCase())) return 'preflighted';

  for (const [name, value] of Object.entries(req.headers)) {
    const lower = name.toLowerCase();
    if (!SAFELISTED_HEADERS.has(lower)) return 'preflighted';
    if (LENGTH_LIMITED_HEADERS.has(lower) && value.length > 128) return 'preflighted';
    if (lower === 'content-type') {
      const mime = value.split(';')[0]!.trim().toLowerCase();
      if (!SAFELISTED_CONTENT_TYPES.has(mime)) return 'preflighted';
    }
  }

  return 'simple';
}

export function evaluatePreflight(
  req: CorsRequest,
  res: PreflightResponse,
  browser: 'chrome' | 'firefox' = 'chrome',
): { allowed: boolean; reason: string; maxAgeApplied: number } {
  const cap = browser === 'firefox' ? 86400 : 7200;
  const rawMaxAge = parseInt(lookupHeader(res.headers, 'access-control-max-age') ?? '', 10);
  const maxAgeApplied = Math.min(Number.isFinite(rawMaxAge) && rawMaxAge >= 0 ? rawMaxAge : 5, cap);

  if (res.status < 200 || res.status >= 300) {
    return { allowed: false, reason: 'preflight response was not successful', maxAgeApplied };
  }

  const acao = lookupHeader(res.headers, 'access-control-allow-origin');
  if (acao !== '*' && acao !== req.origin) {
    return { allowed: false, reason: 'origin not allowed by preflight', maxAgeApplied };
  }

  const allowedMethods = (lookupHeader(res.headers, 'access-control-allow-methods') ?? '')
    .split(',')
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);
  if (!allowedMethods.includes(req.method.toUpperCase())) {
    return { allowed: false, reason: 'method not allowed by preflight', maxAgeApplied };
  }

  const allowedHeaders = new Set(
    (lookupHeader(res.headers, 'access-control-allow-headers') ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
  for (const name of Object.keys(req.headers)) {
    const lower = name.toLowerCase();
    if (SAFELISTED_HEADERS.has(lower)) continue;
    if (!allowedHeaders.has(lower)) {
      return { allowed: false, reason: `header not allowed by preflight: ${lower}`, maxAgeApplied };
    }
  }

  return { allowed: true, reason: 'preflight approved', maxAgeApplied };
}

export function evaluateResponse(req: CorsRequest, res: CorsResponse): { allowed: boolean; reason: string } {
  if (classifyRequest(req) === 'same-origin') {
    return { allowed: true, reason: 'same-origin' };
  }

  const acao = lookupHeader(res.headers, 'access-control-allow-origin');
  if (acao === undefined) {
    return { allowed: false, reason: 'missing Access-Control-Allow-Origin' };
  }

  if (req.credentials === 'include') {
    if (acao === '*') {
      return { allowed: false, reason: 'wildcard origin cannot be used with credentials' };
    }
    if (acao !== req.origin) {
      return { allowed: false, reason: 'origin does not match Access-Control-Allow-Origin' };
    }
    const acac = lookupHeader(res.headers, 'access-control-allow-credentials');
    if (acac !== 'true') {
      return { allowed: false, reason: 'missing Access-Control-Allow-Credentials' };
    }
    return { allowed: true, reason: 'credentialed response approved' };
  }

  if (acao === '*' || acao === req.origin) {
    return { allowed: true, reason: 'response approved' };
  }
  return { allowed: false, reason: 'origin does not match Access-Control-Allow-Origin' };
}

const requestFixtures: CorsRequest[] = [
  {
    origin: 'https://app.example.com',
    targetOrigin: 'https://app.example.com',
    method: 'GET',
    headers: {},
    credentials: 'same-origin',
  },
  {
    origin: 'https://app.example.com',
    targetOrigin: 'https://api.example.com',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'omit',
  },
  {
    origin: 'https://app.example.com',
    targetOrigin: 'https://api.example.com',
    method: 'PUT',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    credentials: 'include',
  },
];

export default function App() {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 16 }}>
      <h3>classifyRequest</h3>
      <table>
        <tbody>
          {requestFixtures.map((req, i) => (
            <tr key={i}>
              <td>
                {req.method} {req.origin} → {req.targetOrigin}
              </td>
              <td>{JSON.stringify(req.headers)}</td>
              <td data-testid="classify-result">{classifyRequest(req)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
