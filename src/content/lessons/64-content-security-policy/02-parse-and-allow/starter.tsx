export type CspPolicy = Map<string, string[]>;

export type ResourceLoad = {
  type: 'script-elem' | 'script-attr' | 'style' | 'img' | 'connect' | 'frame' | 'font';
  url?: string;
  inline?: boolean;
  nonce?: string;
  hash?: string;
  parserInserted?: boolean;
};

const FALLBACK: Record<ResourceLoad['type'], string[]> = {
  'script-elem': ['script-src-elem', 'script-src', 'default-src'],
  'script-attr': ['script-src-attr', 'script-src', 'default-src'],
  style: ['style-src', 'default-src'],
  img: ['img-src', 'default-src'],
  connect: ['connect-src', 'default-src'],
  frame: ['frame-src', 'default-src'],
  font: ['font-src', 'default-src'],
};

/** Parses a raw `Content-Security-Policy` header value into directive -> sources. */
export function parseCsp(header: string): CspPolicy {
  const policy: CspPolicy = new Map();
  for (const rawDirective of header.split(';')) {
    const trimmed = rawDirective.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    if (name === undefined) continue;
    // BUG: this always overwrites, so a repeated directive name lets the
    // LAST occurrence win. The spec says the FIRST occurrence wins.
    policy.set(name, sources);
  }
  return policy;
}

function sameOrigin(url: string, pageOrigin: string): boolean {
  try {
    return new URL(url).origin === pageOrigin;
  } catch {
    return false;
  }
}

function matchesScheme(url: string, schemeSource: string): boolean {
  try {
    return new URL(url).protocol === schemeSource;
  } catch {
    return false;
  }
}

function matchesHost(source: string, url: string): boolean {
  const match = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([^:/]+)(?::(\*|\d+))?$/i.exec(source);
  if (!match) return false;
  const [, scheme, wildcard, host, port] = match;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (scheme) {
    if (parsed.protocol !== `${scheme}:`) return false;
  } else if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  if (wildcard) {
    if (!parsed.hostname.endsWith(`.${host}`)) return false;
  } else if (parsed.hostname !== host) {
    return false;
  }
  if (port && port !== '*') {
    const actualPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    if (actualPort !== port) return false;
  }
  return true;
}

/** Decides whether `load` is permitted by `policy` on a page at `pageOrigin`. */
export function allows(policy: CspPolicy, load: ResourceLoad, pageOrigin: string): boolean {
  const chain = FALLBACK[load.type];
  let sources: string[] | undefined;
  for (const directive of chain) {
    if (policy.has(directive)) {
      sources = policy.get(directive);
      break;
    }
  }
  if (sources === undefined) return true;

  const hasStrictDynamic = sources.includes("'strict-dynamic'");
  const hasNonceOrHash = sources.some((s) => s.startsWith("'nonce-") || s.startsWith("'sha"));
  const hasUnsafeHashes = sources.includes("'unsafe-hashes'");

  for (const source of sources) {
    if (source === "'none'") continue;

    if (source === "'unsafe-inline'") {
      // BUG: should be ignored when hasNonceOrHash is true, but isn't
      // checked here at all.
      if (load.inline) return true;
      continue;
    }

    if (source.startsWith("'nonce-")) {
      if (load.type === 'script-attr') continue;
      if (load.nonce && source === `'nonce-${load.nonce}'`) return true;
      continue;
    }

    if (source.startsWith("'sha")) {
      if (load.type === 'script-attr' && !hasUnsafeHashes) continue;
      if (load.hash && source === `'${load.hash}'`) return true;
      continue;
    }

    if (source === "'strict-dynamic'") {
      if (load.type === 'script-elem' && load.parserInserted === false) return true;
      continue;
    }

    if (source === "'unsafe-eval'" || source === "'unsafe-hashes'" || source === "'report-sample'" || source === "'wasm-unsafe-eval'") {
      continue;
    }

    if (source === "'self'") {
      if (load.inline) continue;
      if (load.url && sameOrigin(load.url, pageOrigin)) return true;
      continue;
    }

    if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) {
      // BUG: should be ignored for script-elem when hasStrictDynamic, but
      // grants access unconditionally here.
      if (load.url && matchesScheme(load.url, source)) return true;
      continue;
    }

    // Host source.
    // BUG: should be ignored for script-elem when hasStrictDynamic, but
    // grants access unconditionally here.
    if (load.url && matchesHost(source, load.url)) return true;
  }

  return false;
}

export default function App() {
  const policy = parseCsp("default-src 'self'; script-src 'nonce-r4nd0m' 'strict-dynamic'; img-src https:");
  const rows = [
    { label: 'nonced inline script', allowed: allows(policy, { type: 'script-elem', inline: true, nonce: 'r4nd0m' }, 'https://app.example.com') },
    { label: 'unrelated inline script', allowed: allows(policy, { type: 'script-elem', inline: true, nonce: 'wrong' }, 'https://app.example.com') },
    { label: 'https image', allowed: allows(policy, { type: 'img', url: 'https://cdn.example.com/logo.png' }, 'https://app.example.com') },
  ];

  return (
    <ul>
      {rows.map((row) => (
        <li key={row.label}>
          {row.label}: {row.allowed ? 'allowed' : 'blocked'}
        </li>
      ))}
    </ul>
  );
}
