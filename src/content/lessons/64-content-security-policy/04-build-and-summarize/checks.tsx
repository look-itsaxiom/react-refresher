import type { Check } from '../../../types';

type StrictCspOptions = {
  nonce: string;
  reportTo?: string;
  trustedTypes?: boolean;
};

type CspViolationReport = {
  effectiveDirective: string;
  blockedURL: string;
};

type ReportGroup = {
  effectiveDirective: string;
  blockedURL: string;
  count: number;
  suggestion: string;
};

type Mod = {
  buildStrictCsp: (options: StrictCspOptions) => string;
  summarizeReports: (reports: CspViolationReport[]) => ReportGroup[];
};

export const checks: Check[] = [
  {
    name: 'buildStrictCsp emits the base template with base-uri none',
    run: async ({ mod, expect }) => {
      const { buildStrictCsp } = mod as unknown as Mod;
      const policy = buildStrictCsp({ nonce: 'abc123' });
      expect(policy).to.equal("script-src 'nonce-abc123' 'strict-dynamic'; object-src 'none'; base-uri 'none'");
    },
  },
  {
    name: 'trustedTypes adds both require-trusted-types-for and trusted-types, in that order',
    run: async ({ mod, expect }) => {
      const { buildStrictCsp } = mod as unknown as Mod;
      const policy = buildStrictCsp({ nonce: 'abc123', trustedTypes: true });
      expect(policy).to.equal(
        "script-src 'nonce-abc123' 'strict-dynamic'; object-src 'none'; base-uri 'none'; require-trusted-types-for 'script'; trusted-types 'default'",
      );
    },
  },
  {
    name: 'reportTo is appended last, after trusted types',
    run: async ({ mod, expect }) => {
      const { buildStrictCsp } = mod as unknown as Mod;
      const policy = buildStrictCsp({ nonce: 'abc123', trustedTypes: true, reportTo: 'csp-endpoint' });
      expect(policy).to.equal(
        "script-src 'nonce-abc123' 'strict-dynamic'; object-src 'none'; base-uri 'none'; require-trusted-types-for 'script'; trusted-types 'default'; report-to csp-endpoint",
      );
    },
  },
  {
    name: 'summarizeReports counts repeated identical reports into one group',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const groups = summarizeReports([
        { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
        { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
      ]);
      expect(groups).to.have.lengthOf(1);
      expect(groups[0]!.count).to.equal(2);
    },
  },
  {
    name: 'summarizeReports keeps different blockedURLs under the same directive as separate groups',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const groups = summarizeReports([
        { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
        { effectiveDirective: 'script-src-elem', blockedURL: 'eval' },
      ]);
      expect(groups, 'an inline violation and an eval violation under the same directive must not merge').to.have.lengthOf(2);
      const byUrl = new Map(groups.map((g) => [g.blockedURL, g] as const));
      expect(byUrl.get('inline')?.count).to.equal(1);
      expect(byUrl.get('eval')?.count).to.equal(1);
    },
  },
  {
    name: 'an inline violation suggests adding a nonce, distinguishing script from style',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const [scriptGroup] = summarizeReports([{ effectiveDirective: 'script-src-elem', blockedURL: 'inline' }]);
      const [styleGroup] = summarizeReports([{ effectiveDirective: 'style-src-elem', blockedURL: 'inline' }]);
      expect(scriptGroup!.suggestion).to.include('nonce').and.to.include('script');
      expect(styleGroup!.suggestion).to.include('nonce').and.to.include('style');
    },
  },
  {
    name: 'an eval violation suggests wasm-unsafe-eval as the WebAssembly escape hatch',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const [group] = summarizeReports([{ effectiveDirective: 'script-src-elem', blockedURL: 'eval' }]);
      expect(group!.suggestion).to.include("wasm-unsafe-eval");
    },
  },
  {
    name: 'a known analytics host suggests loading it under strict-dynamic instead of allowlisting',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const [group] = summarizeReports([
        { effectiveDirective: 'script-src-elem', blockedURL: 'https://www.googletagmanager.com/gtag/js' },
      ]);
      expect(group!.suggestion).to.include('strict-dynamic');
    },
  },
  {
    name: 'an unrecognized host suggests allowlisting it by hostname',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const [group] = summarizeReports([{ effectiveDirective: 'img-src', blockedURL: 'https://tracker.example/pixel.gif' }]);
      expect(group!.suggestion).to.include('tracker.example');
      expect(group!.suggestion).to.include('Allowlist');
    },
  },
  {
    name: 'groups are sorted by count descending',
    run: async ({ mod, expect }) => {
      const { summarizeReports } = mod as unknown as Mod;
      const groups = summarizeReports([
        { effectiveDirective: 'img-src', blockedURL: 'https://a.example/x.png' },
        { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
        { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
        { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
      ]);
      expect(groups[0]!.blockedURL).to.equal('inline');
      expect(groups[0]!.count).to.equal(3);
    },
  },
];
