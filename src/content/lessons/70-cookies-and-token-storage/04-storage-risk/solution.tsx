import { useState } from 'react';

export type StorageOption = 'memory' | 'localStorage' | 'sessionStorage' | 'httpOnlyCookie' | 'bff';
export type CsrfDefense = 'sameSite' | 'token' | 'fetchMetadata' | 'none';
export type XssRisk = 'low' | 'medium' | 'high';
export type AttackerCapability = 'xss' | 'physicalDevice' | 'csrf';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type StoragePlan = {
  accessToken: StorageOption;
  refreshToken: StorageOption;
  csrfDefense: CsrfDefense;
  xssRisk: XssRisk;
};
export type RiskAssessment = {
  stealsAccessToken: AttackerCapability[];
  stealsRefreshToken: AttackerCapability[];
  grade: Grade;
  recommendations: string[];
};

function capabilitiesFor(option: StorageOption, csrfDefense: CsrfDefense): AttackerCapability[] {
  const caps: AttackerCapability[] = [];
  if (option === 'memory' || option === 'localStorage' || option === 'sessionStorage') caps.push('xss');
  if (option === 'localStorage' || option === 'sessionStorage' || option === 'httpOnlyCookie') caps.push('physicalDevice');
  if (option === 'httpOnlyCookie' && csrfDefense === 'none') caps.push('csrf');
  return caps;
}

export function storageRisk(plan: StoragePlan): RiskAssessment {
  const stealsAccessToken = capabilitiesFor(plan.accessToken, plan.csrfDefense);
  const stealsRefreshToken = capabilitiesFor(plan.refreshToken, plan.csrfDefense);

  const tokens = [plan.accessToken, plan.refreshToken];
  const anyLocalStorage = tokens.some((t) => t === 'localStorage');
  const anySessionStorage = tokens.some((t) => t === 'sessionStorage');
  const anyJsReadable = tokens.some((t) => t === 'memory' || t === 'localStorage' || t === 'sessionStorage');
  const anyCookieBorne = tokens.some((t) => t === 'httpOnlyCookie');

  let score = 100;
  if (anyLocalStorage) score -= 40;
  if (anySessionStorage) score -= 20;
  if (anyJsReadable) {
    if (plan.xssRisk === 'high') score -= 20;
    else if (plan.xssRisk === 'medium') score -= 10;
  }
  if (anyCookieBorne && plan.csrfDefense === 'none') score -= 25;

  let grade: Grade;
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';

  const recommendations: string[] = [];
  if (anyLocalStorage) {
    recommendations.push(
      'Move the token out of localStorage: any script on the page, including a successful XSS payload, can read it, and it persists across restarts and tabs.',
    );
  }
  if (anySessionStorage) {
    recommendations.push(
      'sessionStorage is still readable by any script on the page; hold the access token in memory instead and accept that a reload clears it.',
    );
  }
  if (anyCookieBorne && plan.csrfDefense === 'none') {
    recommendations.push(
      'Add a CSRF defense (SameSite, a synchronizer token, or Fetch Metadata checks) alongside the cookie-borne token.',
    );
  }
  if (plan.accessToken !== 'memory' && plan.accessToken !== 'bff') {
    recommendations.push(
      'Prefer holding the access token in memory, or delegating it entirely to a BFF, so no long-lived script-readable copy exists.',
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('This plan matches the recommended pattern: no long-lived, script-readable secret in the browser.');
  }

  return { stealsAccessToken, stealsRefreshToken, grade, recommendations };
}

let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export type ApiResult = { status: number; body: string };
export type Api = (token: string | null) => Promise<ApiResult>;
export type Refresh = () => Promise<string>;

export function TokenHolder({ api, refresh }: { api: Api; refresh: Refresh }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ApiResult | null>(null);

  const handleClick = async () => {
    setStatus('loading');
    try {
      let r = await api(inMemoryAccessToken);
      if (r.status === 401) {
        inMemoryAccessToken = await refresh();
        r = await api(inMemoryAccessToken);
      }
      setResult(r);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Call API</button>
      <p data-testid="status">{status}</p>
      {result && <p data-testid="result-status">{result.status}</p>}
      {result && <p data-testid="result-body">{result.body}</p>}
    </div>
  );
}

const demoApi: Api = async (token) => (token === 'valid' ? { status: 200, body: 'ok' } : { status: 401, body: 'unauthorized' });
const demoRefresh: Refresh = async () => 'valid';

export default function App() {
  return <TokenHolder api={demoApi} refresh={demoRefresh} />;
}
