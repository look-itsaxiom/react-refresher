export type Headers = {
  contentSecurityPolicy?: string;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin' | 'same-origin-allow-popups';
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | 'credentialless';
};

export type EmbedContext = {
  pageOrigin: string;
  embedderOrigin: string;
  popupOpenedWithNoopener: boolean;
  popupSameOrigin: boolean;
};

export type AuditResult = {
  framingAllowed: boolean;
  framingReason: string;
  crossOriginIsolated: boolean;
  sharedArrayBufferAvailable: boolean;
  popupRetainsOpener: boolean;
  fixes: string[];
};

export type MessageLike = { origin: string; data: unknown };
export type ValidationResult = { valid: boolean; reason: string };

/**
 * Extracts the `frame-ancestors` source list from a CSP string, or `undefined` if the
 * policy has no such directive. Already correct -- do not change it.
 */
export function parseFrameAncestors(csp: string | undefined): string[] | undefined {
  if (!csp) return undefined;
  for (const directive of csp.split(';')) {
    const trimmed = directive.trim();
    if (!trimmed) continue;
    const [name, ...rest] = trimmed.split(/\s+/);
    if (name === 'frame-ancestors') return rest;
  }
  return undefined;
}

/** See prompt.md for the exact decision table. */
export function isolationAudit(headers: Headers, embedContext: EmbedContext): AuditResult {
  // TODO: implement per the prompt.
  return {
    framingAllowed: true,
    framingReason: 'not implemented',
    crossOriginIsolated: false,
    sharedArrayBufferAvailable: false,
    popupRetainsOpener: true,
    fixes: [],
  };
}

/** See prompt.md for the exact decision table. */
export function validatePostMessage(event: MessageLike, allowedOrigins: string[]): ValidationResult {
  // TODO: implement per the prompt.
  return { valid: false, reason: 'not implemented' };
}

export default function App() {
  const audit = isolationAudit(
    {
      contentSecurityPolicy: "default-src 'self'; frame-ancestors 'self' https://partner.example",
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginEmbedderPolicy: 'require-corp',
    },
    {
      pageOrigin: 'https://app.example.com',
      embedderOrigin: 'https://partner.example',
      popupOpenedWithNoopener: false,
      popupSameOrigin: false,
    },
  );

  const validation = validatePostMessage(
    { origin: 'https://app.example.com', data: { type: 'ping' } },
    ['https://app.example.com'],
  );

  return (
    <div>
      <p>Framing allowed for partner: {String(audit.framingAllowed)}</p>
      <p>Cross-origin isolated: {String(audit.crossOriginIsolated)}</p>
      <p>Message valid: {String(validation.valid)}</p>
    </div>
  );
}
