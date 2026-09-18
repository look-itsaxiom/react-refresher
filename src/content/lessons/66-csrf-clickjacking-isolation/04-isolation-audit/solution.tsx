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

function framingDecision(headers: Headers, embedContext: EmbedContext): { allowed: boolean; reason: string; hadAnyHeader: boolean } {
  const frameAncestors = parseFrameAncestors(headers.contentSecurityPolicy);

  if (frameAncestors !== undefined) {
    if (frameAncestors.length === 0 || frameAncestors.includes("'none'")) {
      return { allowed: false, reason: "frame-ancestors 'none' blocks all framing", hadAnyHeader: true };
    }
    const allowed = frameAncestors.some(
      (token) => token === embedContext.embedderOrigin || (token === "'self'" && embedContext.embedderOrigin === embedContext.pageOrigin),
    );
    return {
      allowed,
      reason: allowed
        ? `frame-ancestors allows ${embedContext.embedderOrigin}`
        : `frame-ancestors does not list ${embedContext.embedderOrigin}`,
      hadAnyHeader: true,
    };
  }

  if (headers.xFrameOptions === 'DENY') {
    return { allowed: false, reason: 'X-Frame-Options: DENY blocks all framing', hadAnyHeader: true };
  }
  if (headers.xFrameOptions === 'SAMEORIGIN') {
    const allowed = embedContext.embedderOrigin === embedContext.pageOrigin;
    return {
      allowed,
      reason: allowed
        ? 'X-Frame-Options: SAMEORIGIN allows this same-origin embedder'
        : 'X-Frame-Options: SAMEORIGIN blocks this cross-origin embedder',
      hadAnyHeader: true,
    };
  }

  return { allowed: true, reason: 'no framing protection is set; any origin can embed this page', hadAnyHeader: false };
}

export function isolationAudit(headers: Headers, embedContext: EmbedContext): AuditResult {
  const framing = framingDecision(headers, embedContext);

  const crossOriginIsolated =
    headers.crossOriginOpenerPolicy === 'same-origin' &&
    (headers.crossOriginEmbedderPolicy === 'require-corp' || headers.crossOriginEmbedderPolicy === 'credentialless');

  const popupRetainsOpener = embedContext.popupOpenedWithNoopener
    ? false
    : headers.crossOriginOpenerPolicy === 'same-origin' && !embedContext.popupSameOrigin
      ? false
      : true;

  const fixes: string[] = [];
  if (framing.allowed && !framing.hadAnyHeader) {
    fixes.push('Add frame-ancestors to the CSP (or X-Frame-Options as a fallback) to control who may embed this page.');
  }
  if (!crossOriginIsolated) {
    fixes.push(
      'Set Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp (or credentialless) to enable cross-origin isolation.',
    );
  }
  if (popupRetainsOpener && !embedContext.popupSameOrigin) {
    fixes.push('Open cross-origin popups with rel="noopener" (or the noopener window feature) to sever the window.opener reference.');
  }

  return {
    framingAllowed: framing.allowed,
    framingReason: framing.reason,
    crossOriginIsolated,
    sharedArrayBufferAvailable: crossOriginIsolated,
    popupRetainsOpener,
    fixes,
  };
}

export function validatePostMessage(event: MessageLike, allowedOrigins: string[]): ValidationResult {
  if (allowedOrigins.includes('*')) {
    return { valid: false, reason: 'the allowlist contains "*", which accepts messages from any origin' };
  }
  if (!allowedOrigins.includes(event.origin)) {
    return { valid: false, reason: `origin ${event.origin} is not in the allowlist` };
  }
  const data = event.data;
  const hasStringType =
    typeof data === 'object' && data !== null && !Array.isArray(data) && typeof (data as Record<string, unknown>).type === 'string';
  if (!hasStringType) {
    return { valid: false, reason: 'message payload must be an object with a string "type" field' };
  }
  return { valid: true, reason: 'origin is allowlisted and the payload has a valid shape' };
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
