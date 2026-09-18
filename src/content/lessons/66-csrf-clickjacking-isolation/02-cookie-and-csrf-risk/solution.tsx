export type SameSite = 'Strict' | 'Lax' | 'None';

export type Cookie = {
  name: string;
  sameSite: SameSite;
  secure: boolean;
  partitioned: boolean;
};

export type Request = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  initiatorUrl: string;
  targetUrl: string;
  topLevelNavigation: boolean;
  ageOfCookieSeconds: number;
};

export type Endpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  sideEffects: boolean;
  cookieAuth: boolean;
  sameSite: SameSite;
  checksOrigin: boolean;
  checksFetchMetadata: boolean;
  csrfToken: boolean;
};

export type CsrfVerdict = { classification: 'protected' | 'exposed'; reasons: string[] };

/**
 * Simplified eTLD+1 + scheme extraction. Real "site" comparison needs the public
 * suffix list (to know `co.uk` is one label, not two); this is good enough for the
 * fixtures in this exercise. Already correct -- do not change it.
 */
export function siteOf(url: string): { scheme: 'https' | 'http'; site: string } {
  const u = new URL(url);
  const scheme = u.protocol === 'https:' ? 'https' : 'http';
  const parts = u.hostname.split('.');
  const site = parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
  return { scheme, site };
}

export function cookieSent(cookie: Cookie, request: Request): boolean {
  if (cookie.sameSite === 'None' && !cookie.secure) return false;

  const target = siteOf(request.targetUrl);
  if (cookie.secure && target.scheme !== 'https') return false;

  const initiator = siteOf(request.initiatorUrl);
  const sameSiteRequest = initiator.scheme === target.scheme && initiator.site === target.site;
  if (sameSiteRequest) return true;

  switch (cookie.sameSite) {
    case 'Strict':
      return false;
    case 'None':
      return true;
    case 'Lax':
      if (!request.topLevelNavigation) return false;
      if (request.method === 'GET') return true;
      if (request.method === 'POST') return request.ageOfCookieSeconds <= 120;
      return false;
  }
}

export function csrfRisk(endpoint: Endpoint): CsrfVerdict {
  if (!endpoint.cookieAuth) {
    return {
      classification: 'protected',
      reasons: ['no ambient-cookie auth; classic CSRF does not apply here (check XSS/token-theft exposure separately)'],
    };
  }

  if (endpoint.csrfToken) {
    return { classification: 'protected', reasons: ['a CSRF token is required and validated'] };
  }

  if (endpoint.checksOrigin || endpoint.checksFetchMetadata) {
    const reasons: string[] = [];
    if (endpoint.checksOrigin) reasons.push('the endpoint verifies the Origin header');
    if (endpoint.checksFetchMetadata) reasons.push('the endpoint verifies Sec-Fetch-Site');
    return { classification: 'protected', reasons };
  }

  if (endpoint.sameSite === 'Strict') {
    return {
      classification: 'protected',
      reasons: ['SameSite=Strict cookies are never sent cross-site, including top-level navigations'],
    };
  }

  if (!endpoint.sideEffects) {
    return { classification: 'protected', reasons: ['no state change to forge'] };
  }

  if (endpoint.sameSite === 'None') {
    return {
      classification: 'exposed',
      reasons: ['SameSite=None sends the cookie on every cross-site request; nothing else here blocks a forged one'],
    };
  }

  // sameSite === 'Lax'
  if (endpoint.method === 'GET') {
    return {
      classification: 'exposed',
      reasons: [
        'a state-changing GET can be reached by any link, redirect, or GET form; SameSite=Lax still allows cross-site top-level GET navigation',
      ],
    };
  }

  return {
    classification: 'exposed',
    reasons: [
      'a cross-site HTML form POST is a top-level navigation; the temporary Lax+POST allowance can still attach a recently-set cookie, and nothing else here blocks it',
    ],
  };
}

export default function App() {
  const cookie: Cookie = { name: 'session', sameSite: 'Lax', secure: true, partitioned: false };
  const request: Request = {
    method: 'GET',
    initiatorUrl: 'https://evil.example/',
    targetUrl: 'https://app.example.com/dashboard',
    topLevelNavigation: true,
    ageOfCookieSeconds: 500,
  };
  const sent = cookieSent(cookie, request);
  const risk = csrfRisk({
    method: 'POST',
    sideEffects: true,
    cookieAuth: true,
    sameSite: 'Lax',
    checksOrigin: false,
    checksFetchMetadata: false,
    csrfToken: false,
  });

  return (
    <div>
      <p>Cookie sent on cross-site GET link click: {String(sent)}</p>
      <p>Endpoint classification: {risk.classification}</p>
      <ul>
        {risk.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
