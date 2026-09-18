export type CorsRequest = {
  origin: string;
  targetOrigin: string;
  method: string;
  headers: Record<string, string>;
  credentials: 'include' | 'same-origin' | 'omit';
};

export type CorsResponse = { headers: Record<string, string> };
export type PreflightResponse = { status: number; headers: Record<string, string> };

export function classifyRequest(req: CorsRequest): 'same-origin' | 'simple' | 'preflighted' {
  // TODO: apply the CORS-safelisted-request rules.
  return 'simple';
}

export function evaluatePreflight(
  req: CorsRequest,
  res: PreflightResponse,
  browser: 'chrome' | 'firefox' = 'chrome',
): { allowed: boolean; reason: string; maxAgeApplied: number } {
  // TODO: check status, ACAO, allow-methods, allow-headers; compute the clamped max-age.
  return { allowed: true, reason: 'preflight approved', maxAgeApplied: 5 };
}

export function evaluateResponse(req: CorsRequest, res: CorsResponse): { allowed: boolean; reason: string } {
  // TODO: decide whether the calling script can read this response.
  return { allowed: true, reason: 'same-origin' };
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
