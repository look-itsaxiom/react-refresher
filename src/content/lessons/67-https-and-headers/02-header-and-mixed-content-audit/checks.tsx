import type { Check } from '../../../types';

type FindingStatus = 'pass' | 'warn' | 'fail';
type Finding = { header: string; status: FindingStatus; fix: string };
type AuditResult = { grade: 'A' | 'B' | 'C' | 'D' | 'F'; findings: Finding[] };
type Headers = Record<string, string>;

type ResourceType = 'script' | 'style' | 'fetch' | 'img' | 'audio' | 'video';
type Resource = { url: string; type: ResourceType };
type Classification = 'secure' | 'upgradable' | 'blocked';
type ClassifiedResource = Resource & { classification: Classification };

type Mod = {
  auditHeaders: (headers: Headers, opts: { isHttps: boolean }) => AuditResult;
  mixedContent: (pageUrl: string, resources: Resource[]) => ClassifiedResource[];
};

const GOOD_HEADERS: Headers = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

function findingFor(result: AuditResult, header: string): Finding | undefined {
  return result.findings.find((f) => f.header === header);
}

export const checks: Check[] = [
  {
    name: 'a fully compliant header set earns an A with every finding passing',
    run: async ({ mod, expect }) => {
      const { auditHeaders } = mod as unknown as Mod;
      const result = auditHeaders(GOOD_HEADERS, { isHttps: true });
      expect(result.grade).to.equal('A');
      expect(result.findings.every((f) => f.status === 'pass')).to.equal(true);
      expect(result.findings.map((f) => f.header)).to.deep.equal([
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Framing protection',
        'Cross-origin isolation',
        'Server disclosure',
      ]);
    },
  },
  {
    name: 'a long max-age HSTS header missing includeSubDomains warns instead of passing',
    run: async ({ mod, expect }) => {
      const { auditHeaders } = mod as unknown as Mod;
      const result = auditHeaders({ 'strict-transport-security': 'max-age=63072000' }, { isHttps: true });
      expect(findingFor(result, 'Strict-Transport-Security')?.status).to.equal('warn');
    },
  },
  {
    name: 'HSTS on a non-HTTPS page always fails, regardless of the header value',
    run: async ({ mod, expect }) => {
      const { auditHeaders } = mod as unknown as Mod;
      const result = auditHeaders(
        { 'strict-transport-security': 'max-age=63072000; includeSubDomains' },
        { isHttps: false },
      );
      expect(findingFor(result, 'Strict-Transport-Security')?.status).to.equal('fail');
    },
  },
  {
    name: 'Permissions-Policy missing one of camera/microphone/geolocation warns',
    run: async ({ mod, expect }) => {
      const { auditHeaders } = mod as unknown as Mod;
      const result = auditHeaders({ 'permissions-policy': 'camera=(), microphone=()' }, { isHttps: true });
      expect(findingFor(result, 'Permissions-Policy')?.status).to.equal('warn');
    },
  },
  {
    name: 'an empty header set on an HTTPS page grades F',
    run: async ({ mod, expect }) => {
      const { auditHeaders } = mod as unknown as Mod;
      const result = auditHeaders({}, { isHttps: true });
      expect(result.grade).to.equal('F');
    },
  },
  {
    name: 'a disclosed Server header warns but does not fail the finding',
    run: async ({ mod, expect }) => {
      const { auditHeaders } = mod as unknown as Mod;
      const result = auditHeaders({ ...GOOD_HEADERS, server: 'nginx/1.27' }, { isHttps: true });
      expect(findingFor(result, 'Server disclosure')?.status).to.equal('warn');
    },
  },
  {
    name: 'an http:// video on an https:// page is upgradable, not blocked',
    run: async ({ mod, expect }) => {
      const { mixedContent } = mod as unknown as Mod;
      const results = mixedContent('https://example.com', [{ url: 'http://cdn.example.com/hero.mp4', type: 'video' }]);
      expect(results[0]?.classification).to.equal('upgradable');
    },
  },
  {
    name: 'http:// scripts, styles, and fetches on an https:// page are blocked outright',
    run: async ({ mod, expect }) => {
      const { mixedContent } = mod as unknown as Mod;
      const results = mixedContent('https://example.com', [
        { url: 'http://cdn.example.com/app.js', type: 'script' },
        { url: 'http://cdn.example.com/app.css', type: 'style' },
        { url: 'http://api.example.com/data', type: 'fetch' },
      ]);
      expect(results.every((r) => r.classification === 'blocked')).to.equal(true);
    },
  },
  {
    name: 'an https:// resource is secure regardless of type',
    run: async ({ mod, expect }) => {
      const { mixedContent } = mod as unknown as Mod;
      const results = mixedContent('https://example.com', [{ url: 'https://cdn.example.com/app.js', type: 'script' }]);
      expect(results[0]?.classification).to.equal('secure');
    },
  },
  {
    name: 'mixed-content rules do not apply when the page itself is not https',
    run: async ({ mod, expect }) => {
      const { mixedContent } = mod as unknown as Mod;
      const results = mixedContent('http://example.com', [
        { url: 'http://cdn.example.com/app.js', type: 'script' },
        { url: 'http://cdn.example.com/hero.mp4', type: 'video' },
      ]);
      expect(results.every((r) => r.classification === 'secure')).to.equal(true);
    },
  },
];
