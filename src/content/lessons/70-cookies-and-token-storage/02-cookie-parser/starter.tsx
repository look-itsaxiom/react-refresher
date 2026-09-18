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

/** See prompt.md for the exact parsing rules. */
export function parseSetCookie(header: string): ParsedCookie {
  // TODO: implement per the prompt.
  return {
    name: '',
    value: '',
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
}

/** See prompt.md for the exact attribute order. */
export function serializeCookie(cookie: ParsedCookie): string {
  // TODO: implement per the prompt.
  return '';
}

/** See prompt.md for the exact rule list. */
export function validateCookie(cookie: ParsedCookie, opts: { requestUrl: string }): string[] {
  // TODO: implement per the prompt.
  return [];
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
