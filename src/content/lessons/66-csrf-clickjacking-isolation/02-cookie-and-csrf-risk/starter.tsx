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

/** See prompt.md for the exact decision table. */
export function cookieSent(cookie: Cookie, request: Request): boolean {
  // TODO: implement the decision table from the prompt.
  return false;
}

/** See prompt.md for the exact decision table. */
export function csrfRisk(endpoint: Endpoint): CsrfVerdict {
  // TODO: implement the decision table from the prompt.
  return { classification: 'protected', reasons: ['not implemented'] };
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
