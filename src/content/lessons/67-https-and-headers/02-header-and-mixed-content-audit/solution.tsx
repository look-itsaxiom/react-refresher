export type Headers = Record<string, string>;

export type FindingStatus = 'pass' | 'warn' | 'fail';
export type Finding = { header: string; status: FindingStatus; fix: string };
export type AuditResult = { grade: 'A' | 'B' | 'C' | 'D' | 'F'; findings: Finding[] };

export type ResourceType = 'script' | 'style' | 'fetch' | 'img' | 'audio' | 'video';
export type Resource = { url: string; type: ResourceType };
export type Classification = 'secure' | 'upgradable' | 'blocked';
export type ClassifiedResource = Resource & { classification: Classification };

const POINTS: Record<FindingStatus, number> = { pass: 2, warn: 1, fail: 0 };

/**
 * Scores a set of response headers against a baseline security-header
 * checklist. Grading table: pass=2, warn=1, fail=0, summed over all 7
 * findings out of 14 possible, then 13-14 => A, 10-12 => B, 7-9 => C,
 * 4-6 => D, 0-3 => F.
 */
export function auditHeaders(headers: Headers, opts: { isHttps: boolean }): AuditResult {
  const findings: Finding[] = [];

  // 1. Strict-Transport-Security
  const hsts = headers['strict-transport-security'];
  if (!opts.isHttps) {
    findings.push({
      header: 'Strict-Transport-Security',
      status: 'fail',
      fix: 'Serve the site over HTTPS before adding Strict-Transport-Security.',
    });
  } else if (!hsts) {
    findings.push({
      header: 'Strict-Transport-Security',
      status: 'fail',
      fix: 'Add Strict-Transport-Security with max-age of at least 31536000 (1 year).',
    });
  } else {
    const maxAgeMatch = /max-age=(\d+)/.exec(hsts);
    const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 0;
    const hasSubdomains = /includesubdomains/i.test(hsts);
    if (maxAge < 31536000) {
      findings.push({
        header: 'Strict-Transport-Security',
        status: 'warn',
        fix: 'Increase max-age to at least 31536000 (1 year).',
      });
    } else if (!hasSubdomains) {
      findings.push({
        header: 'Strict-Transport-Security',
        status: 'warn',
        fix: 'Add includeSubDomains so subdomains are covered too.',
      });
    } else {
      findings.push({ header: 'Strict-Transport-Security', status: 'pass', fix: '' });
    }
  }

  // 2. X-Content-Type-Options
  const xcto = headers['x-content-type-options'];
  if (xcto?.toLowerCase() === 'nosniff') {
    findings.push({ header: 'X-Content-Type-Options', status: 'pass', fix: '' });
  } else {
    findings.push({ header: 'X-Content-Type-Options', status: 'fail', fix: 'Set X-Content-Type-Options: nosniff.' });
  }

  // 3. Referrer-Policy
  const rp = headers['referrer-policy'];
  if (rp === 'unsafe-url') {
    findings.push({
      header: 'Referrer-Policy',
      status: 'fail',
      fix: 'Replace unsafe-url with strict-origin-when-cross-origin or stricter.',
    });
  } else if (!rp || rp === 'no-referrer-when-downgrade') {
    findings.push({
      header: 'Referrer-Policy',
      status: 'warn',
      fix: 'Explicitly set Referrer-Policy to strict-origin-when-cross-origin or stricter.',
    });
  } else {
    findings.push({ header: 'Referrer-Policy', status: 'pass', fix: '' });
  }

  // 4. Permissions-Policy
  const pp = headers['permissions-policy'];
  if (!pp) {
    findings.push({
      header: 'Permissions-Policy',
      status: 'fail',
      fix: 'Add a Permissions-Policy restricting camera, microphone, and geolocation.',
    });
  } else {
    const restricted = ['camera', 'microphone', 'geolocation'].every((feature) => pp.includes(feature));
    findings.push({
      header: 'Permissions-Policy',
      status: restricted ? 'pass' : 'warn',
      fix: restricted
        ? ''
        : 'Explicitly restrict camera, microphone, and geolocation, e.g. camera=(), microphone=(), geolocation=().',
    });
  }

  // 5. Framing protection (CSP frame-ancestors or X-Frame-Options)
  const csp = headers['content-security-policy'];
  const xfo = headers['x-frame-options'];
  const hasFrameAncestors = !!csp && /frame-ancestors/i.test(csp);
  if (hasFrameAncestors || xfo) {
    findings.push({ header: 'Framing protection', status: 'pass', fix: '' });
  } else if (csp) {
    findings.push({
      header: 'Framing protection',
      status: 'warn',
      fix: 'Add frame-ancestors to your Content-Security-Policy, or set X-Frame-Options.',
    });
  } else {
    findings.push({
      header: 'Framing protection',
      status: 'fail',
      fix: 'Add a Content-Security-Policy with frame-ancestors, or set X-Frame-Options.',
    });
  }

  // 6. Cross-origin isolation (COOP / CORP)
  const coop = headers['cross-origin-opener-policy'];
  const corp = headers['cross-origin-resource-policy'];
  if (coop && corp) {
    findings.push({ header: 'Cross-origin isolation', status: 'pass', fix: '' });
  } else if (coop || corp) {
    findings.push({
      header: 'Cross-origin isolation',
      status: 'warn',
      fix: 'Set both Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy.',
    });
  } else {
    findings.push({
      header: 'Cross-origin isolation',
      status: 'fail',
      fix: 'Set Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy.',
    });
  }

  // 7. Server / X-Powered-By disclosure
  if (headers['server'] || headers['x-powered-by']) {
    findings.push({
      header: 'Server disclosure',
      status: 'warn',
      fix: 'Remove Server and X-Powered-By headers to avoid advertising your stack.',
    });
  } else {
    findings.push({ header: 'Server disclosure', status: 'pass', fix: '' });
  }

  const score = findings.reduce((sum, f) => sum + POINTS[f.status], 0);
  const grade = score >= 13 ? 'A' : score >= 10 ? 'B' : score >= 7 ? 'C' : score >= 4 ? 'D' : 'F';

  return { grade, findings };
}

// Passive content types the browser tries to auto-upgrade to https:// before
// giving up and blocking them. Active content (script/style/fetch) never
// gets this treatment -- it's blocked outright.
const AUTOUPGRADE_TYPES: ResourceType[] = ['img', 'audio', 'video'];

/**
 * Classifies each resource a page loads as 'secure', 'upgradable', or
 * 'blocked' mixed content, given the page's own URL.
 */
export function mixedContent(pageUrl: string, resources: Resource[]): ClassifiedResource[] {
  const pageIsHttps = pageUrl.startsWith('https://');
  return resources.map((resource) => {
    if (!pageIsHttps || resource.url.startsWith('https://')) {
      return { ...resource, classification: 'secure' };
    }
    return { ...resource, classification: AUTOUPGRADE_TYPES.includes(resource.type) ? 'upgradable' : 'blocked' };
  });
}

export default function App() {
  const audit = auditHeaders(
    {
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
    },
    { isHttps: true },
  );

  const resources = mixedContent('https://example.com', [
    { url: 'https://example.com/app.js', type: 'script' },
    { url: 'http://example.com/hero.mp4', type: 'video' },
  ]);

  return (
    <div>
      <p>Grade: {audit.grade}</p>
      <ul>
        {audit.findings.map((finding) => (
          <li key={finding.header}>
            {finding.header}: {finding.status}
          </li>
        ))}
      </ul>
      <ul>
        {resources.map((resource) => (
          <li key={resource.url}>
            {resource.url}: {resource.classification}
          </li>
        ))}
      </ul>
    </div>
  );
}
