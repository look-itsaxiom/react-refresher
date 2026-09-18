import type { Check } from '../../../types';

type ResourceLoad = {
  type: 'script-elem' | 'script-attr' | 'style' | 'img' | 'connect' | 'frame' | 'font';
  url?: string;
  inline?: boolean;
  nonce?: string;
  hash?: string;
  parserInserted?: boolean;
};

type Mod = {
  parseCsp: (header: string) => Map<string, string[]>;
  allows: (policy: Map<string, string[]>, load: ResourceLoad, pageOrigin: string) => boolean;
};

const ORIGIN = 'https://app.example.com';

export const checks: Check[] = [
  {
    name: 'parseCsp splits directives and their sources',
    run: async ({ mod, expect }) => {
      const { parseCsp } = mod as unknown as Mod;
      const policy = parseCsp("default-src 'self'; object-src 'none'");
      expect(policy.get('default-src')).to.deep.equal(["'self'"]);
      expect(policy.get('object-src')).to.deep.equal(["'none'"]);
    },
  },
  {
    name: 'parseCsp keeps the first occurrence of a repeated directive',
    run: async ({ mod, expect }) => {
      const { parseCsp } = mod as unknown as Mod;
      const policy = parseCsp("script-src 'none'; img-src 'self'; script-src 'self'");
      expect(policy.get('script-src')).to.deep.equal(["'none'"]);
    },
  },
  {
    name: 'a script falls back to default-src when script-src is absent',
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("default-src 'self'");
      expect(allows(policy, { type: 'script-elem', url: 'https://app.example.com/a.js' }, ORIGIN)).to.equal(true);
      expect(allows(policy, { type: 'script-elem', url: 'https://evil.example/a.js' }, ORIGIN)).to.equal(false);
    },
  },
  {
    name: 'script-src-elem takes precedence over script-src for script elements',
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("script-src 'self'; script-src-elem 'none'");
      expect(allows(policy, { type: 'script-elem', url: 'https://app.example.com/a.js' }, ORIGIN)).to.equal(false);
    },
  },
  {
    name: "'self' matches same-origin loads and blocks cross-origin ones",
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("img-src 'self'");
      expect(allows(policy, { type: 'img', url: 'https://app.example.com/logo.png' }, ORIGIN)).to.equal(true);
      expect(allows(policy, { type: 'img', url: 'https://cdn.example.com/logo.png' }, ORIGIN)).to.equal(false);
    },
  },
  {
    name: 'a nonce source matches only an inline script with that exact nonce',
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("script-src 'nonce-r4nd0m'");
      expect(allows(policy, { type: 'script-elem', inline: true, nonce: 'r4nd0m' }, ORIGIN)).to.equal(true);
      expect(allows(policy, { type: 'script-elem', inline: true, nonce: 'wrong' }, ORIGIN)).to.equal(false);
    },
  },
  {
    name: "'unsafe-inline' is ignored once a nonce source is present in the same directive",
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("script-src 'unsafe-inline' 'nonce-r4nd0m'");
      expect(allows(policy, { type: 'script-elem', inline: true, nonce: 'wrong' }, ORIGIN), 'unsafe-inline should not rescue an unnonced inline script').to.equal(false);
    },
  },
  {
    name: "'unsafe-inline' allows inline content when no nonce or hash is present",
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("style-src 'unsafe-inline'");
      expect(allows(policy, { type: 'style', inline: true }, ORIGIN)).to.equal(true);
    },
  },
  {
    name: "'strict-dynamic' ignores a host allowlist for parser-inserted scripts, but still trusts non-parser-inserted ones",
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("script-src 'nonce-r4nd0m' 'strict-dynamic' https://cdn.example.com");
      expect(
        allows(policy, { type: 'script-elem', url: 'https://cdn.example.com/vendor.js', parserInserted: true }, ORIGIN),
        'a parser-inserted <script src> should not be rescued by the host allowlist once strict-dynamic is present',
      ).to.equal(false);
      expect(
        allows(policy, { type: 'script-elem', url: 'https://anywhere.example/vendor.js', parserInserted: false }, ORIGIN),
        'a script inserted by already-trusted code should be allowed regardless of its own host',
      ).to.equal(true);
    },
  },
  {
    name: 'a load type with no directive anywhere in its fallback chain is unrestricted',
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp("script-src 'self'");
      expect(allows(policy, { type: 'frame', url: 'https://anywhere.example/embed' }, ORIGIN)).to.equal(true);
    },
  },
  {
    name: 'a wildcard host source matches subdomains but not the bare domain',
    run: async ({ mod, expect }) => {
      const { parseCsp, allows } = mod as unknown as Mod;
      const policy = parseCsp('img-src *.example.com');
      expect(allows(policy, { type: 'img', url: 'https://cdn.example.com/logo.png' }, ORIGIN)).to.equal(true);
      expect(allows(policy, { type: 'img', url: 'https://example.com/logo.png' }, ORIGIN)).to.equal(false);
    },
  },
];
