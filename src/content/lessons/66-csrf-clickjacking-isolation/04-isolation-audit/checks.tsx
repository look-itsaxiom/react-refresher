import type { Check } from '../../../types';

type Headers = {
  contentSecurityPolicy?: string;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin' | 'same-origin-allow-popups';
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | 'credentialless';
};
type EmbedContext = {
  pageOrigin: string;
  embedderOrigin: string;
  popupOpenedWithNoopener: boolean;
  popupSameOrigin: boolean;
};
type AuditResult = {
  framingAllowed: boolean;
  framingReason: string;
  crossOriginIsolated: boolean;
  sharedArrayBufferAvailable: boolean;
  popupRetainsOpener: boolean;
  fixes: string[];
};
type MessageLike = { origin: string; data: unknown };
type ValidationResult = { valid: boolean; reason: string };

type Mod = {
  isolationAudit: (headers: Headers, embedContext: EmbedContext) => AuditResult;
  validatePostMessage: (event: MessageLike, allowedOrigins: string[]) => ValidationResult;
};

const embedContext = (overrides: Partial<EmbedContext> = {}): EmbedContext => ({
  pageOrigin: 'https://app.example.com',
  embedderOrigin: 'https://evil.example',
  popupOpenedWithNoopener: false,
  popupSameOrigin: false,
  ...overrides,
});

export const checks: Check[] = [
  {
    name: 'isolationAudit: with no framing headers at all, framing is allowed from anywhere',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit({}, embedContext());
      expect(result.framingAllowed).to.equal(true);
      expect(result.fixes.some((f) => /frame-ancestors/i.test(f)), 'should suggest adding frame-ancestors').to.equal(true);
    },
  },
  {
    name: "isolationAudit: frame-ancestors 'none' blocks framing even from the page's own origin",
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { contentSecurityPolicy: "frame-ancestors 'none'" },
        embedContext({ embedderOrigin: 'https://app.example.com' }),
      );
      expect(result.framingAllowed).to.equal(false);
    },
  },
  {
    name: "isolationAudit: frame-ancestors 'self' allows only the page's own origin",
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { contentSecurityPolicy: "frame-ancestors 'self'" },
        embedContext({ embedderOrigin: 'https://app.example.com' }),
      );
      expect(result.framingAllowed).to.equal(true);
      const blocked = isolationAudit(
        { contentSecurityPolicy: "frame-ancestors 'self'" },
        embedContext({ embedderOrigin: 'https://evil.example' }),
      );
      expect(blocked.framingAllowed).to.equal(false);
    },
  },
  {
    name: 'isolationAudit: CSP frame-ancestors takes precedence over X-Frame-Options when both are set',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { contentSecurityPolicy: "frame-ancestors https://partner.example", xFrameOptions: 'DENY' },
        embedContext({ embedderOrigin: 'https://partner.example' }),
      );
      expect(result.framingAllowed, 'CSP allows partner.example even though XFO says DENY').to.equal(true);
    },
  },
  {
    name: 'isolationAudit: falls back to X-Frame-Options: SAMEORIGIN when there is no frame-ancestors directive',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const sameOrigin = isolationAudit(
        { xFrameOptions: 'SAMEORIGIN' },
        embedContext({ embedderOrigin: 'https://app.example.com' }),
      );
      expect(sameOrigin.framingAllowed).to.equal(true);
      const crossOrigin = isolationAudit({ xFrameOptions: 'SAMEORIGIN' }, embedContext());
      expect(crossOrigin.framingAllowed).to.equal(false);
    },
  },
  {
    name: 'isolationAudit: COOP same-origin + COEP require-corp grants cross-origin isolation and SharedArrayBuffer',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { crossOriginOpenerPolicy: 'same-origin', crossOriginEmbedderPolicy: 'require-corp' },
        embedContext(),
      );
      expect(result.crossOriginIsolated).to.equal(true);
      expect(result.sharedArrayBufferAvailable).to.equal(true);
    },
  },
  {
    name: 'isolationAudit: COEP credentialless also grants cross-origin isolation',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { crossOriginOpenerPolicy: 'same-origin', crossOriginEmbedderPolicy: 'credentialless' },
        embedContext(),
      );
      expect(result.crossOriginIsolated).to.equal(true);
    },
  },
  {
    name: 'isolationAudit: same-origin-allow-popups does not grant cross-origin isolation',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { crossOriginOpenerPolicy: 'same-origin-allow-popups', crossOriginEmbedderPolicy: 'require-corp' },
        embedContext(),
      );
      expect(result.crossOriginIsolated, 'same-origin-allow-popups is weaker than same-origin').to.equal(false);
      expect(result.sharedArrayBufferAvailable).to.equal(false);
    },
  },
  {
    name: 'isolationAudit: COOP same-origin severs window.opener for a cross-origin popup',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit(
        { crossOriginOpenerPolicy: 'same-origin' },
        embedContext({ popupOpenedWithNoopener: false, popupSameOrigin: false }),
      );
      expect(result.popupRetainsOpener).to.equal(false);
    },
  },
  {
    name: 'isolationAudit: an explicit noopener popup keeps no opener reference regardless of COOP',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit({}, embedContext({ popupOpenedWithNoopener: true, popupSameOrigin: false }));
      expect(result.popupRetainsOpener).to.equal(false);
    },
  },
  {
    name: 'isolationAudit: default unsafe-none COOP retains the opener reference for a cross-origin popup',
    run: async ({ mod, expect }) => {
      const { isolationAudit } = mod as unknown as Mod;
      const result = isolationAudit({}, embedContext({ popupOpenedWithNoopener: false, popupSameOrigin: false }));
      expect(result.popupRetainsOpener).to.equal(true);
      expect(result.fixes.some((f) => /noopener/i.test(f)), 'should recommend noopener when the opener is retained').to.equal(true);
    },
  },
  {
    name: 'validatePostMessage: "*" in the allowlist is rejected outright',
    run: async ({ mod, expect }) => {
      const { validatePostMessage } = mod as unknown as Mod;
      const result = validatePostMessage({ origin: 'https://app.example.com', data: { type: 'ping' } }, ['*']);
      expect(result.valid).to.equal(false);
    },
  },
  {
    name: 'validatePostMessage: an origin outside the allowlist is rejected',
    run: async ({ mod, expect }) => {
      const { validatePostMessage } = mod as unknown as Mod;
      const result = validatePostMessage({ origin: 'https://evil.example', data: { type: 'ping' } }, [
        'https://app.example.com',
      ]);
      expect(result.valid).to.equal(false);
    },
  },
  {
    name: 'validatePostMessage: a null payload is rejected even though typeof null === "object"',
    run: async ({ mod, expect }) => {
      const { validatePostMessage } = mod as unknown as Mod;
      const result = validatePostMessage({ origin: 'https://app.example.com', data: null }, [
        'https://app.example.com',
      ]);
      expect(result.valid).to.equal(false);
    },
  },
  {
    name: 'validatePostMessage: an array or a missing/non-string type field is rejected',
    run: async ({ mod, expect }) => {
      const { validatePostMessage } = mod as unknown as Mod;
      const allowed = ['https://app.example.com'];
      const arrayResult = validatePostMessage({ origin: 'https://app.example.com', data: ['ping'] }, allowed);
      expect(arrayResult.valid).to.equal(false);
      const noTypeResult = validatePostMessage({ origin: 'https://app.example.com', data: { value: 1 } }, allowed);
      expect(noTypeResult.valid).to.equal(false);
      const numericTypeResult = validatePostMessage({ origin: 'https://app.example.com', data: { type: 1 } }, allowed);
      expect(numericTypeResult.valid).to.equal(false);
    },
  },
  {
    name: 'validatePostMessage: an allowlisted origin with a well-shaped payload is valid',
    run: async ({ mod, expect }) => {
      const { validatePostMessage } = mod as unknown as Mod;
      const result = validatePostMessage({ origin: 'https://app.example.com', data: { type: 'ping' } }, [
        'https://app.example.com',
      ]);
      expect(result.valid).to.equal(true);
    },
  },
];
