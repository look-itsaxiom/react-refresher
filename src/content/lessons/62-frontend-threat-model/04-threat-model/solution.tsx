export type EntryPoint = { id: string; label: string };
export type Feature = {
  assets: string[];
  entryPoints: EntryPoint[];
  trustBoundaries: string[];
  thirdParty: string[];
};

export type StrideCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'Information Disclosure'
  | 'Denial of Service'
  | 'Elevation of Privilege';

export type Threat = {
  entryPointId: string;
  category: StrideCategory;
  control: string;
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  risk: number;
};

export type CatalogRule = {
  /** matched as a case-insensitive substring against the entry point's label */
  match: string;
  category: StrideCategory;
  control: string;
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
};

export const THREAT_CATALOG: CatalogRule[] = [
  {
    match: 'postmessage',
    category: 'Spoofing',
    control: 'validate event.origin (and event.source) before trusting the message',
    likelihood: 2,
    impact: 3,
  },
  {
    match: 'third-party script',
    category: 'Tampering',
    control: 'Subresource Integrity plus a CSP script-src that pins the host',
    likelihood: 2,
    impact: 3,
  },
  {
    match: 'url',
    category: 'Tampering',
    control: 'validate server-side and re-derive state from the session, never trust the param directly',
    likelihood: 3,
    impact: 2,
  },
  {
    match: 'form',
    category: 'Tampering',
    control: 'validate every field server-side; never trust a client-supplied identity field',
    likelihood: 3,
    impact: 2,
  },
  {
    match: 'oauth redirect',
    category: 'Spoofing',
    control: 'validate redirect_uri against an allowlist and use state plus PKCE',
    likelihood: 2,
    impact: 3,
  },
  {
    match: 'file upload',
    category: 'Elevation of Privilege',
    control: 'validate content-type and size server-side; never execute uploaded content',
    likelihood: 2,
    impact: 3,
  },
  {
    match: 'websocket',
    category: 'Denial of Service',
    control: 'rate limit and re-authenticate the connection server-side',
    likelihood: 1,
    impact: 2,
  },
  {
    match: 'clipboard',
    category: 'Information Disclosure',
    control: 'avoid auto-copying sensitive data; scope what is exposed to the clipboard',
    likelihood: 1,
    impact: 1,
  },
];

function matchesRule(label: string, rule: CatalogRule): boolean {
  return label.toLowerCase().includes(rule.match.toLowerCase());
}

export function threatModel(feature: Feature): Threat[] {
  const points: { id: string; label: string }[] = [
    ...feature.entryPoints.map((e) => ({ id: e.id, label: e.label })),
    ...feature.thirdParty.map((t) => ({ id: t, label: t })),
  ];

  const threats: Threat[] = [];

  for (const point of points) {
    for (const rule of THREAT_CATALOG) {
      if (!matchesRule(point.label, rule)) continue;
      threats.push({
        entryPointId: point.id,
        category: rule.category,
        control: rule.control,
        likelihood: rule.likelihood,
        impact: rule.impact,
        risk: rule.likelihood * rule.impact,
      });
    }
  }

  return threats.sort((a, b) => b.risk - a.risk);
}

const sampleFeature: Feature = {
  assets: ['session token', 'other users\' profile data'],
  entryPoints: [
    { id: 'ep-search', label: 'search URL query param' },
    { id: 'ep-embed', label: 'postMessage from embedded widget' },
    { id: 'ep-avatar', label: 'file upload for profile avatar' },
  ],
  trustBoundaries: ['client parses the widget message', 'server stores the uploaded file'],
  thirdParty: ['third-party script (analytics SDK)'],
};

export default function App() {
  const threats = threatModel(sampleFeature);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>{threats.length} threat(s), ranked by risk</h2>
      <ol>
        {threats.map((t, i) => (
          <li key={i}>
            <strong>{t.category}</strong> on <code>{t.entryPointId}</code> (risk {t.risk}) — {t.control}
          </li>
        ))}
      </ol>
    </div>
  );
}
