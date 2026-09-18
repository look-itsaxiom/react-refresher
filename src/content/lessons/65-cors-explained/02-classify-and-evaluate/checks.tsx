import type { Check } from '../../../types';

type CorsRequest = {
  origin: string;
  targetOrigin: string;
  method: string;
  headers: Record<string, string>;
  credentials: 'include' | 'same-origin' | 'omit';
};
type CorsResponse = { headers: Record<string, string> };
type PreflightResponse = { status: number; headers: Record<string, string> };

type Mod = {
  classifyRequest: (req: CorsRequest) => 'same-origin' | 'simple' | 'preflighted';
  evaluatePreflight: (
    req: CorsRequest,
    res: PreflightResponse,
    browser?: 'chrome' | 'firefox',
  ) => { allowed: boolean; reason: string; maxAgeApplied: number };
  evaluateResponse: (req: CorsRequest, res: CorsResponse) => { allowed: boolean; reason: string };
};

const base: CorsRequest = {
  origin: 'https://app.example.com',
  targetOrigin: 'https://api.example.com',
  method: 'GET',
  headers: {},
  credentials: 'omit',
};

export const checks: Check[] = [
  {
    name: 'classifyRequest treats a matching origin and target as same-origin regardless of method or headers',
    run: async ({ mod, expect }) => {
      const { classifyRequest } = mod as unknown as Mod;
      expect(
        classifyRequest({ ...base, targetOrigin: base.origin, method: 'DELETE', headers: { 'x-api-key': 'x' } }),
      ).to.equal('same-origin');
    },
  },
  {
    name: 'classifyRequest: GET/HEAD/POST with only safelisted headers and an allowed Content-Type is simple',
    run: async ({ mod, expect }) => {
      const { classifyRequest } = mod as unknown as Mod;
      expect(classifyRequest({ ...base, method: 'GET' }), 'bare GET').to.equal('simple');
      expect(
        classifyRequest({ ...base, method: 'POST', headers: { 'content-type': 'text/plain' } }),
        'POST text/plain',
      ).to.equal('simple');
      expect(
        classifyRequest({
          ...base,
          method: 'POST',
          headers: { 'content-type': 'multipart/form-data; boundary=x' },
        }),
        'multipart with boundary param',
      ).to.equal('simple');
    },
  },
  {
    name: 'classifyRequest: a non-GET/HEAD/POST method is always preflighted, even with no extra headers',
    run: async ({ mod, expect }) => {
      const { classifyRequest } = mod as unknown as Mod;
      expect(classifyRequest({ ...base, method: 'PUT' })).to.equal('preflighted');
      expect(classifyRequest({ ...base, method: 'DELETE' })).to.equal('preflighted');
    },
  },
  {
    name: 'classifyRequest: a JSON Content-Type or a custom header forces a preflight, but crossing the 128-byte limit is what matters, not merely being long',
    run: async ({ mod, expect }) => {
      const { classifyRequest } = mod as unknown as Mod;
      expect(
        classifyRequest({ ...base, method: 'POST', headers: { 'content-type': 'application/json' } }),
        'application/json',
      ).to.equal('preflighted');
      expect(classifyRequest({ ...base, headers: { 'x-request-id': 'abc' } }), 'custom header').to.equal(
        'preflighted',
      );
      expect(
        classifyRequest({ ...base, headers: { accept: 'a'.repeat(128) } }),
        '128 bytes is still within the limit',
      ).to.equal('simple');
      expect(
        classifyRequest({ ...base, headers: { accept: 'a'.repeat(129) } }),
        '129 bytes crosses the limit',
      ).to.equal('preflighted');
    },
  },
  {
    name: 'evaluatePreflight rejects a mismatched origin, a disallowed method, and a missing custom header, each with a distinct reason',
    run: async ({ mod, expect }) => {
      const { evaluatePreflight } = mod as unknown as Mod;
      const req: CorsRequest = { ...base, method: 'PUT', headers: { 'x-api-key': 'k' } };

      const badOrigin = evaluatePreflight(req, {
        status: 204,
        headers: { 'access-control-allow-origin': 'https://evil.example.com' },
      });
      expect(badOrigin.allowed).to.equal(false);
      expect(badOrigin.reason).to.match(/origin/i);

      const badMethod = evaluatePreflight(req, {
        status: 204,
        headers: {
          'access-control-allow-origin': req.origin,
          'access-control-allow-methods': 'GET, POST',
          'access-control-allow-headers': 'x-api-key',
        },
      });
      expect(badMethod.allowed).to.equal(false);
      expect(badMethod.reason).to.match(/method/i);

      const badHeader = evaluatePreflight(req, {
        status: 204,
        headers: {
          'access-control-allow-origin': req.origin,
          'access-control-allow-methods': 'PUT',
          'access-control-allow-headers': 'content-type',
        },
      });
      expect(badHeader.allowed).to.equal(false);
      expect(badHeader.reason.toLowerCase()).to.include('x-api-key');
    },
  },
  {
    name: 'evaluatePreflight approves a fully-matching preflight and ignores case/whitespace in the allow-lists',
    run: async ({ mod, expect }) => {
      const { evaluatePreflight } = mod as unknown as Mod;
      const req: CorsRequest = { ...base, method: 'PUT', headers: { 'X-Api-Key': 'k' } };
      const result = evaluatePreflight(req, {
        status: 204,
        headers: {
          'access-control-allow-origin': req.origin,
          'access-control-allow-methods': ' put , post ',
          'access-control-allow-headers': 'Content-Type,  x-api-key ',
        },
      });
      expect(result.allowed).to.equal(true);
    },
  },
  {
    name: 'evaluatePreflight clamps Access-Control-Max-Age to the browser cap and defaults to 5 seconds when absent',
    run: async ({ mod, expect }) => {
      const { evaluatePreflight } = mod as unknown as Mod;
      const req: CorsRequest = { ...base, method: 'GET' };
      const okRes = { status: 204, headers: { 'access-control-allow-origin': req.origin } };

      const chromeHigh = evaluatePreflight(req, { ...okRes, headers: { ...okRes.headers, 'access-control-max-age': '99999' } }, 'chrome');
      expect(chromeHigh.maxAgeApplied).to.equal(7200);

      const firefoxHigh = evaluatePreflight(req, { ...okRes, headers: { ...okRes.headers, 'access-control-max-age': '99999' } }, 'firefox');
      expect(firefoxHigh.maxAgeApplied).to.equal(86400);

      const missing = evaluatePreflight(req, okRes);
      expect(missing.maxAgeApplied).to.equal(5);
    },
  },
  {
    name: 'evaluateResponse: a same-origin request is always allowed; a cross-origin request needs a matching Access-Control-Allow-Origin',
    run: async ({ mod, expect }) => {
      const { evaluateResponse } = mod as unknown as Mod;
      expect(evaluateResponse({ ...base, targetOrigin: base.origin }, { headers: {} }).allowed).to.equal(true);
      expect(evaluateResponse(base, { headers: {} }).allowed, 'missing ACAO').to.equal(false);
      expect(evaluateResponse(base, { headers: { 'access-control-allow-origin': '*' } }).allowed, 'wildcard ok without credentials').to.equal(true);
      expect(
        evaluateResponse(base, { headers: { 'access-control-allow-origin': 'https://other.example.com' } }).allowed,
        'mismatched origin',
      ).to.equal(false);
    },
  },
  {
    name: 'evaluateResponse: a credentialed request rejects the wildcard and requires Access-Control-Allow-Credentials: true',
    run: async ({ mod, expect }) => {
      const { evaluateResponse } = mod as unknown as Mod;
      const req: CorsRequest = { ...base, credentials: 'include' };

      const wildcard = evaluateResponse(req, { headers: { 'access-control-allow-origin': '*' } });
      expect(wildcard.allowed).to.equal(false);
      expect(wildcard.reason).to.match(/wildcard/i);

      const noCredHeader = evaluateResponse(req, { headers: { 'access-control-allow-origin': req.origin } });
      expect(noCredHeader.allowed).to.equal(false);
      expect(noCredHeader.reason).to.match(/credentials/i);

      const approved = evaluateResponse(req, {
        headers: { 'access-control-allow-origin': req.origin, 'access-control-allow-credentials': 'true' },
      });
      expect(approved.allowed).to.equal(true);
    },
  },
];
