export type StrictCspOptions = {
  nonce: string;
  reportTo?: string;
  trustedTypes?: boolean;
};

/** Builds the recommended strict-CSP header value. */
export function buildStrictCsp(options: StrictCspOptions): string {
  const directives = [`script-src 'nonce-${options.nonce}' 'strict-dynamic'`, "object-src 'none'", "base-uri 'self'"];

  // BUG: base-uri above should be 'none', not 'self'.

  if (options.trustedTypes) {
    // BUG: missing "require-trusted-types-for 'script'" -- without it,
    // this trusted-types entry declares a policy name but requires nothing.
    directives.push("trusted-types 'default'");
  }

  if (options.reportTo) {
    directives.push(`report-to ${options.reportTo}`);
  }

  return directives.join('; ');
}

export type CspViolationReport = {
  effectiveDirective: string;
  blockedURL: string; // a real URL, or the literal "inline" or "eval"
};

export type ReportGroup = {
  effectiveDirective: string;
  blockedURL: string;
  count: number;
  suggestion: string;
};

const KNOWN_HOSTS = ['www.googletagmanager.com', 'www.google-analytics.com'];

function suggestFix(effectiveDirective: string, blockedURL: string): string {
  if (blockedURL === 'inline') {
    return effectiveDirective.includes('style')
      ? "Add a nonce to this inline style (or hash it) instead of relying on 'unsafe-inline'."
      : "Add a nonce to this inline script (or hash it) instead of relying on 'unsafe-inline'.";
  }
  if (blockedURL === 'eval') {
    return "Refactor away from eval/new Function, or add 'wasm-unsafe-eval' if this is WebAssembly compilation.";
  }
  let hostname = blockedURL;
  try {
    hostname = new URL(blockedURL).hostname;
  } catch {
    // blockedURL wasn't a full URL; fall back to using it as-is.
  }
  if (KNOWN_HOSTS.includes(hostname)) {
    return `Load ${hostname} through a nonced loader script under 'strict-dynamic' instead of allowlisting the host directly.`;
  }
  return `Allowlist ${hostname} in ${effectiveDirective} if this load is intentional, otherwise remove the reference to it.`;
}

/** Groups violation reports and suggests a fix for each group. */
export function summarizeReports(reports: CspViolationReport[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();

  for (const report of reports) {
    // BUG: keying by effectiveDirective alone merges reports that share a
    // directive but block different URLs (e.g. an inline-script violation
    // and an eval violation both under script-src-elem).
    const key = report.effectiveDirective;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        effectiveDirective: report.effectiveDirective,
        blockedURL: report.blockedURL,
        count: 1,
        suggestion: suggestFix(report.effectiveDirective, report.blockedURL),
      });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.effectiveDirective !== b.effectiveDirective) return a.effectiveDirective.localeCompare(b.effectiveDirective);
    return a.blockedURL.localeCompare(b.blockedURL);
  });
}

export default function App() {
  const policy = buildStrictCsp({ nonce: 'abc123', trustedTypes: true, reportTo: 'csp-endpoint' });
  const groups = summarizeReports([
    { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
    { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
    { effectiveDirective: 'script-src-elem', blockedURL: 'eval' },
    { effectiveDirective: 'img-src', blockedURL: 'https://tracker.example/pixel.gif' },
  ]);

  return (
    <div>
      <p>{policy}</p>
      <ul>
        {groups.map((group) => (
          <li key={`${group.effectiveDirective}-${group.blockedURL}`}>
            {group.effectiveDirective} / {group.blockedURL}: {group.count}x -- {group.suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}
