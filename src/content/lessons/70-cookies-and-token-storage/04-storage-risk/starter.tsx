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

/** See prompt.md for the exact rules. */
export function storageRisk(plan: StoragePlan): RiskAssessment {
  // TODO: implement per the prompt.
  return {
    stealsAccessToken: [],
    stealsRefreshToken: [],
    grade: 'F',
    recommendations: ['not implemented'],
  };
}

let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export type ApiResult = { status: number; body: string };
export type Api = (token: string | null) => Promise<ApiResult>;
export type Refresh = () => Promise<string>;

/** See prompt.md: call api(token), and on a 401, refresh() then retry once. */
export function TokenHolder({ api, refresh }: { api: Api; refresh: Refresh }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ApiResult | null>(null);

  const handleClick = async () => {
    setStatus('loading');
    try {
      // TODO: call api(inMemoryAccessToken); on a 401, refresh() and retry once.
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
