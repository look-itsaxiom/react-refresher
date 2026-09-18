export type SameSite = 'Strict' | 'Lax' | 'None';
export type Priority = 'Low' | 'Medium' | 'High';
export type ParsedCookie = {
  name: string;
  value: string;
  domain: string | null;
  path: string | null;
  expires: string | null;
  maxAge: number | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite | null;
  partitioned: boolean;
  priority: Priority | null;
  expiryBasis: 'max-age' | 'expires' | 'session';
};

export function parseSetCookie(header: string): ParsedCookie {
  const segments = header
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const first = segments[0] ?? '';
  const attrs = segments.slice(1);
  const firstEq = first.indexOf('=');
  const name = firstEq === -1 ? first : first.slice(0, firstEq);
  const value = firstEq === -1 ? '' : first.slice(firstEq + 1);

  const cookie: ParsedCookie = {
    name,
    value,
    domain: null,
    path: null,
    expires: null,
    maxAge: null,
    secure: false,
    httpOnly: false,
    sameSite: null,
    partitioned: false,
    priority: null,
    expiryBasis: 'session',
  };

  for (const attr of attrs) {
    const eqIdx = attr.indexOf('=');
    const rawKey = eqIdx === -1 ? attr : attr.slice(0, eqIdx);
    const rawVal = eqIdx === -1 ? '' : attr.slice(eqIdx + 1);
    const key = rawKey.trim().toLowerCase();
    const val = rawVal.trim();

    switch (key) {
      case 'domain':
        cookie.domain = val.replace(/^\./, '').toLowerCase();
        break;
      case 'path':
        cookie.path = val;
        break;
      case 'expires':
        cookie.expires = val;
        break;
      case 'max-age': {
        const n = Number(val);
        if (!Number.isNaN(n)) cookie.maxAge = n;
        break;
      }
      case 'samesite': {
        const norm = val.toLowerCase();
        if (norm === 'strict') cookie.sameSite = 'Strict';
        else if (norm === 'lax') cookie.sameSite = 'Lax';
        else if (norm === 'none') cookie.sameSite = 'None';
        break;
      }
      case 'priority': {
        const norm = val.toLowerCase();
        if (norm === 'low') cookie.priority = 'Low';
        else if (norm === 'medium') cookie.priority = 'Medium';
        else if (norm === 'high') cookie.priority = 'High';
        break;
      }
      case 'secure':
        cookie.secure = true;
        break;
      case 'httponly':
        cookie.httpOnly = true;
        break;
      case 'partitioned':
        cookie.partitioned = true;
        break;
      default:
        break;
    }
  }

  cookie.expiryBasis = cookie.maxAge !== null ? 'max-age' : cookie.expires !== null ? 'expires' : 'session';
  return cookie;
}

export function serializeCookie(cookie: ParsedCookie): string {
  const parts = [`${cookie.name}=${cookie.value}`];
  if (cookie.domain) parts.push(`Domain=${cookie.domain}`);
  if (cookie.path) parts.push(`Path=${cookie.path}`);
  if (cookie.expires) parts.push(`Expires=${cookie.expires}`);
  if (cookie.maxAge !== null) parts.push(`Max-Age=${cookie.maxAge}`);
  if (cookie.secure) parts.push('Secure');
  if (cookie.httpOnly) parts.push('HttpOnly');
  if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
  if (cookie.partitioned) parts.push('Partitioned');
  if (cookie.priority) parts.push(`Priority=${cookie.priority}`);
  return parts.join('; ');
}

export function validateCookie(cookie: ParsedCookie, opts: { requestUrl: string }): string[] {
  const violations: string[] = [];
  const url = new URL(opts.requestUrl);
  const isHttps = url.protocol === 'https:';

  if (cookie.name.startsWith('__Host-')) {
    if (!cookie.secure) violations.push('__Host- cookies must set Secure');
    if (cookie.domain) violations.push('__Host- cookies must not set Domain');
    if (cookie.path !== '/') violations.push('__Host- cookies must set Path=/');
  }
  if (cookie.name.startsWith('__Secure-') && !cookie.secure) {
    violations.push('__Secure- cookies must set Secure');
  }
  if (cookie.sameSite === 'None' && !cookie.secure) {
    violations.push('SameSite=None requires Secure');
  }
  if (cookie.partitioned && !cookie.secure) {
    violations.push('Partitioned cookies must set Secure');
  }
  if (cookie.secure && !isHttps) {
    violations.push('Secure cookies cannot be set from a non-https request');
  }
  if (cookie.name.length + cookie.value.length > 4096) {
    violations.push('cookie exceeds the 4096-byte name+value limit');
  }
  if (cookie.domain) {
    const host = url.hostname.toLowerCase();
    const domain = cookie.domain.toLowerCase();
    const matches = host === domain || host.endsWith(`.${domain}`);
    if (!matches) violations.push('Domain is not a suffix of the request host');
  }

  return violations;
}

export default function App() {
  const parsed = parseSetCookie('__Host-session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900');
  const violations = validateCookie(parsed, { requestUrl: 'https://app.example.com/dashboard' });
  const roundTrip = serializeCookie(parsed);

  return (
    <div>
      <p>Parsed name: {parsed.name}</p>
      <p>Expiry basis: {parsed.expiryBasis}</p>
      <p>Violations: {violations.length === 0 ? 'none' : violations.join(', ')}</p>
      <p>Serialized: {roundTrip}</p>
    </div>
  );
}
