import type { Check } from '../../../types';

type SameSite = 'Strict' | 'Lax' | 'None';
type Priority = 'Low' | 'Medium' | 'High';
type ParsedCookie = {
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

type Mod = {
  parseSetCookie: (header: string) => ParsedCookie;
  serializeCookie: (cookie: ParsedCookie) => string;
  validateCookie: (cookie: ParsedCookie, opts: { requestUrl: string }) => string[];
};

export const checks: Check[] = [
  {
    name: 'parseSetCookie: reads name, value, and boolean/value attributes',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax');
      expect(c.name).to.equal('session');
      expect(c.value).to.equal('abc123');
      expect(c.path).to.equal('/');
      expect(c.httpOnly).to.equal(true);
      expect(c.secure).to.equal(true);
      expect(c.sameSite).to.equal('Lax');
    },
  },
  {
    name: 'parseSetCookie: attribute names and SameSite/Priority values are case-insensitive',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('id=xyz; SECURE; HTTPONLY; SAMESITE=strict; PRIORITY=high');
      expect(c.secure).to.equal(true);
      expect(c.httpOnly).to.equal(true);
      expect(c.sameSite, 'SameSite value should normalize to the capitalized literal').to.equal('Strict');
      expect(c.priority).to.equal('High');
    },
  },
  {
    name: 'parseSetCookie: Domain is lowercased with a leading dot stripped',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('id=xyz; Domain=.Example.com');
      expect(c.domain).to.equal('example.com');
    },
  },
  {
    name: 'parseSetCookie: Max-Age takes precedence over Expires for expiryBasis, but both are kept',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('id=xyz; Max-Age=3600; Expires=Wed, 21 Oct 2026 07:28:00 GMT');
      expect(c.maxAge).to.equal(3600);
      expect(c.expires).to.equal('Wed, 21 Oct 2026 07:28:00 GMT');
      expect(c.expiryBasis, 'Max-Age governs actual lifetime when both are present').to.equal('max-age');
    },
  },
  {
    name: 'parseSetCookie: no Expires/Max-Age is a session cookie',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('id=xyz; Path=/');
      expect(c.maxAge).to.equal(null);
      expect(c.expires).to.equal(null);
      expect(c.expiryBasis).to.equal('session');
    },
  },
  {
    name: 'parseSetCookie: Expires alone (no Max-Age) sets expiryBasis to expires',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('id=xyz; Expires=Wed, 21 Oct 2026 07:28:00 GMT');
      expect(c.expiryBasis).to.equal('expires');
    },
  },
  {
    name: 'parseSetCookie: Partitioned is parsed as a boolean flag',
    run: async ({ mod, expect }) => {
      const { parseSetCookie } = mod as unknown as Mod;
      const c = parseSetCookie('cid=xyz; Partitioned; Secure; Path=/');
      expect(c.partitioned).to.equal(true);
    },
  },
  {
    name: 'serializeCookie -> parseSetCookie round-trips a fully-populated cookie',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, serializeCookie } = mod as unknown as Mod;
      const original = parseSetCookie(
        '__Host-session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900; Partitioned; Priority=High',
      );
      const roundTripped = parseSetCookie(serializeCookie(original));
      expect(roundTripped).to.deep.equal(original);
    },
  },
  {
    name: 'serializeCookie omits attributes that are null or false',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, serializeCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('id=xyz');
      const serialized = serializeCookie(cookie);
      expect(serialized).to.not.match(/Secure|HttpOnly|SameSite|Partitioned|Domain|Path|Priority/);
      expect(serialized.startsWith('id=xyz')).to.equal(true);
    },
  },
  {
    name: 'validateCookie: a fully-correct __Host- cookie over https has no violations',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('__Host-session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax');
      const violations = validateCookie(cookie, { requestUrl: 'https://app.example.com/dashboard' });
      expect(violations).to.deep.equal([]);
    },
  },
  {
    name: 'validateCookie: __Host- with a Domain and no Secure reports both violations',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('__Host-session=abc123; Path=/; Domain=example.com');
      const violations = validateCookie(cookie, { requestUrl: 'https://app.example.com/dashboard' });
      expect(violations.some((v) => /__Host-/.test(v) && /Secure/i.test(v))).to.equal(true);
      expect(violations.some((v) => /__Host-/.test(v) && /Domain/i.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: __Secure- without Secure violates',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('__Secure-pref=abc');
      const violations = validateCookie(cookie, { requestUrl: 'https://app.example.com/' });
      expect(violations.some((v) => /__Secure-/.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: SameSite=None without Secure violates',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('id=xyz; SameSite=None');
      const violations = validateCookie(cookie, { requestUrl: 'https://app.example.com/' });
      expect(violations.some((v) => /SameSite=None/i.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: Partitioned without Secure violates',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('id=xyz; Partitioned');
      const violations = validateCookie(cookie, { requestUrl: 'https://app.example.com/' });
      expect(violations.some((v) => /Partitioned/i.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: Secure cookie set from a plain-http request violates',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('id=xyz; Secure');
      const violations = validateCookie(cookie, { requestUrl: 'http://app.example.com/' });
      expect(violations.some((v) => /https/i.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: name+value over 4096 bytes violates',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie(`id=${'x'.repeat(4100)}`);
      const violations = validateCookie(cookie, { requestUrl: 'https://app.example.com/' });
      expect(violations.some((v) => /4096/.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: Domain that is not a suffix of the request host violates',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('id=xyz; Domain=example.com');
      const violations = validateCookie(cookie, { requestUrl: 'https://evil.com/' });
      expect(violations.some((v) => /Domain/i.test(v))).to.equal(true);
    },
  },
  {
    name: 'validateCookie: Domain matching a subdomain of the request host does not violate the Domain rule',
    run: async ({ mod, expect }) => {
      const { parseSetCookie, validateCookie } = mod as unknown as Mod;
      const cookie = parseSetCookie('id=xyz; Domain=example.com; Secure');
      const violations = validateCookie(cookie, { requestUrl: 'https://sub.example.com/' });
      expect(violations.some((v) => /Domain/i.test(v))).to.equal(false);
    },
  },
];
