import type { Check } from '../../../types';

type SameSite = 'Strict' | 'Lax' | 'None';
type Cookie = { name: string; sameSite: SameSite; secure: boolean; partitioned: boolean };
type Request = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  initiatorUrl: string;
  targetUrl: string;
  topLevelNavigation: boolean;
  ageOfCookieSeconds: number;
};
type Endpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  sideEffects: boolean;
  cookieAuth: boolean;
  sameSite: SameSite;
  checksOrigin: boolean;
  checksFetchMetadata: boolean;
  csrfToken: boolean;
};
type CsrfVerdict = { classification: 'protected' | 'exposed'; reasons: string[] };

type Mod = {
  cookieSent: (cookie: Cookie, request: Request) => boolean;
  csrfRisk: (endpoint: Endpoint) => CsrfVerdict;
};

const cookie = (overrides: Partial<Cookie> = {}): Cookie => ({
  name: 'session',
  sameSite: 'Lax',
  secure: true,
  partitioned: false,
  ...overrides,
});

const request = (overrides: Partial<Request> = {}): Request => ({
  method: 'GET',
  initiatorUrl: 'https://evil.example/',
  targetUrl: 'https://app.example.com/dashboard',
  topLevelNavigation: true,
  ageOfCookieSeconds: 0,
  ...overrides,
});

const endpoint = (overrides: Partial<Endpoint> = {}): Endpoint => ({
  method: 'POST',
  sideEffects: true,
  cookieAuth: true,
  sameSite: 'Lax',
  checksOrigin: false,
  checksFetchMetadata: false,
  csrfToken: false,
  ...overrides,
});

export const checks: Check[] = [
  {
    name: 'cookieSent: SameSite=None without Secure is never sent',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'None', secure: false });
      const same = request({ initiatorUrl: 'https://app.example.com/x', targetUrl: 'https://app.example.com/y' });
      expect(cookieSent(c, same), 'invalid None-without-Secure cookie, even same-site').to.equal(false);
    },
  },
  {
    name: 'cookieSent: a Secure cookie is withheld from a plain-http target',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'None', secure: true });
      const r = request({
        initiatorUrl: 'http://app.example.com/x',
        targetUrl: 'http://app.example.com/y',
      });
      expect(cookieSent(c, r), 'Secure cookies only ride on https targets').to.equal(false);
    },
  },
  {
    name: 'cookieSent: a same-site request always carries the cookie regardless of SameSite value',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Strict', secure: true });
      const r = request({
        initiatorUrl: 'https://checkout.example.com/pay',
        targetUrl: 'https://app.example.com/dashboard',
        topLevelNavigation: false,
      });
      expect(cookieSent(c, r), 'checkout.example.com and app.example.com share a site').to.equal(true);
    },
  },
  {
    name: 'cookieSent: schemeful same-site treats http and https on the same host as cross-site',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Strict', secure: false });
      const r = request({
        initiatorUrl: 'http://app.example.com/x',
        targetUrl: 'https://app.example.com/y',
        topLevelNavigation: true,
      });
      expect(cookieSent(c, r), 'different scheme on the same host is cross-site under schemeful same-site').to.equal(false);
    },
  },
  {
    name: 'cookieSent: Strict is never sent cross-site, even on a top-level GET link click',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Strict', secure: true });
      const r = request({ method: 'GET', topLevelNavigation: true });
      expect(cookieSent(c, r)).to.equal(false);
    },
  },
  {
    name: 'cookieSent: Lax is sent on a cross-site top-level GET navigation',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Lax', secure: true });
      const r = request({ method: 'GET', topLevelNavigation: true });
      expect(cookieSent(c, r)).to.equal(true);
    },
  },
  {
    name: 'cookieSent: Lax is withheld on a cross-site subresource GET (e.g. an <img>)',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Lax', secure: true });
      const r = request({ method: 'GET', topLevelNavigation: false });
      expect(cookieSent(c, r), 'subresource loads are not top-level navigations').to.equal(false);
    },
  },
  {
    name: 'cookieSent: Lax+POST exception sends a recently-set cookie on a top-level cross-site POST',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Lax', secure: true });
      const r = request({ method: 'POST', topLevelNavigation: true, ageOfCookieSeconds: 30 });
      expect(cookieSent(c, r), 'within the 2-minute Lax+POST window').to.equal(true);
    },
  },
  {
    name: 'cookieSent: Lax+POST exception expires after 2 minutes',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'Lax', secure: true });
      const r = request({ method: 'POST', topLevelNavigation: true, ageOfCookieSeconds: 121 });
      expect(cookieSent(c, r), 'past the 2-minute window the cross-site POST no longer carries it').to.equal(false);
    },
  },
  {
    name: 'cookieSent: None is sent on every cross-site request regardless of method',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const c = cookie({ sameSite: 'None', secure: true, partitioned: false });
      const r = request({ method: 'PUT', topLevelNavigation: false });
      expect(cookieSent(c, r)).to.equal(true);
    },
  },
  {
    name: 'cookieSent: partitioned does not change whether a valid None cookie is attached',
    run: async ({ mod, expect }) => {
      const { cookieSent } = mod as unknown as Mod;
      const unpartitioned = cookie({ sameSite: 'None', secure: true, partitioned: false });
      const partitioned = cookie({ sameSite: 'None', secure: true, partitioned: true });
      const r = request({ method: 'GET', topLevelNavigation: false });
      expect(cookieSent(unpartitioned, r)).to.equal(true);
      expect(cookieSent(partitioned, r), 'partitioning changes which jar is read, not the send decision').to.equal(true);
    },
  },
  {
    name: 'csrfRisk: no cookie auth is always protected',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ cookieAuth: false, sameSite: 'None', csrfToken: false, checksOrigin: false }));
      expect(result.classification).to.equal('protected');
      expect(result.reasons.length).to.be.greaterThan(0);
    },
  },
  {
    name: 'csrfRisk: a valid CSRF token protects even a Lax cookie-authed POST',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ csrfToken: true }));
      expect(result.classification).to.equal('protected');
    },
  },
  {
    name: 'csrfRisk: an Origin check protects and names the check in the reasons',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ checksOrigin: true }));
      expect(result.classification).to.equal('protected');
      expect(result.reasons.some((r) => /origin/i.test(r)), 'should mention the Origin check').to.equal(true);
    },
  },
  {
    name: 'csrfRisk: both Origin and Fetch Metadata checks report both reasons',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ checksOrigin: true, checksFetchMetadata: true }));
      expect(result.classification).to.equal('protected');
      expect(result.reasons.length).to.equal(2);
    },
  },
  {
    name: 'csrfRisk: SameSite=Strict protects a cookie-authed endpoint with no other defenses',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ sameSite: 'Strict' }));
      expect(result.classification).to.equal('protected');
    },
  },
  {
    name: 'csrfRisk: no side effects is protected regardless of SameSite',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ sideEffects: false, sameSite: 'None' }));
      expect(result.classification).to.equal('protected');
    },
  },
  {
    name: 'csrfRisk: SameSite=Lax POST with side effects and no other defense is exposed',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ method: 'POST', sameSite: 'Lax' }));
      expect(result.classification).to.equal('exposed');
      expect(result.reasons.some((r) => /Lax\+POST|top-level navigation/i.test(r))).to.equal(true);
    },
  },
  {
    name: 'csrfRisk: SameSite=Lax state-changing GET is exposed via link/redirect',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ method: 'GET', sameSite: 'Lax' }));
      expect(result.classification).to.equal('exposed');
      expect(result.reasons.some((r) => /GET/i.test(r))).to.equal(true);
    },
  },
  {
    name: 'csrfRisk: SameSite=None with side effects and no other defense is exposed',
    run: async ({ mod, expect }) => {
      const { csrfRisk } = mod as unknown as Mod;
      const result = csrfRisk(endpoint({ sameSite: 'None' }));
      expect(result.classification).to.equal('exposed');
    },
  },
];
