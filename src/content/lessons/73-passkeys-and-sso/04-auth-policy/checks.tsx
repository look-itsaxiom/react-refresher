import type { Check } from '../../../types';

type UserFactors = {
  email: string;
  hasPasskey: boolean;
  hasTotp: boolean;
  hasSms: boolean;
  ssoProvider?: string;
};

type AuthActionContext = {
  action: 'login' | 'view' | 'payout' | 'change-email' | 'recover-account';
  riskScore: number;
  lastAuthAgeSeconds: number;
  amr: string[];
};

type AuthPolicy = {
  enterpriseDomains: string[];
  highRiskActions: string[];
  riskScoreThreshold: number;
  stepUpWindowSeconds: number;
  smsStepUpActions: string[];
};

type Mod = {
  authPolicy: (user: UserFactors, context: AuthActionContext, policy: AuthPolicy) => { decision: string; reason: string };
};

const POLICY: AuthPolicy = {
  enterpriseDomains: ['acme.com'],
  highRiskActions: ['payout', 'change-email'],
  riskScoreThreshold: 80,
  stepUpWindowSeconds: 300,
  smsStepUpActions: ['view', 'change-email'],
};

export const checks: Check[] = [
  {
    name: 'allows a low-risk action for a non-enterprise user with no extra checks needed',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: true, hasTotp: false, hasSms: false },
        { action: 'view', riskScore: 10, lastAuthAgeSeconds: 0, amr: ['pwd'] },
        POLICY,
      );
      expect(result.decision).to.equal('allow');
    },
  },
  {
    name: 'requires SSO for an enterprise-domain user with no active SSO session, regardless of enrolled factors',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'ada@acme.com', hasPasskey: true, hasTotp: true, hasSms: true },
        { action: 'login', riskScore: 5, lastAuthAgeSeconds: 0, amr: [] },
        POLICY,
      );
      expect(result.decision).to.equal('sso-required');
    },
  },
  {
    name: 'allows an enterprise-domain user once ssoProvider is set',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'ada@acme.com', hasPasskey: false, hasTotp: false, hasSms: false, ssoProvider: 'okta' },
        { action: 'login', riskScore: 5, lastAuthAgeSeconds: 0, amr: ['pwd'] },
        POLICY,
      );
      expect(result.decision).to.equal('allow');
    },
  },
  {
    name: 'allows a high-risk action when a fresh phishing-resistant factor is already in amr, within the step-up window',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: true, hasTotp: false, hasSms: false },
        { action: 'payout', riskScore: 10, lastAuthAgeSeconds: 30, amr: ['webauthn'] },
        POLICY,
      );
      expect(result.decision).to.equal('allow');
    },
  },
  {
    name: 'requires step-up for a high-risk action when the webauthn factor is stale (older than the step-up window)',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: true, hasTotp: false, hasSms: false },
        { action: 'payout', riskScore: 10, lastAuthAgeSeconds: 9000, amr: ['webauthn'] },
        POLICY,
      );
      expect(result.decision).to.equal('step-up:passkey');
    },
  },
  {
    name: 'falls back to step-up:totp for a high-risk action when the user has no passkey',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: false, hasTotp: true, hasSms: true },
        { action: 'change-email', riskScore: 10, lastAuthAgeSeconds: 9000, amr: ['pwd'] },
        POLICY,
      );
      expect(result.decision).to.equal('step-up:totp');
    },
  },
  {
    name: 'denies a payout step-up when SMS is the only enrolled factor -- SMS never satisfies step-up for payouts',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: false, hasTotp: false, hasSms: true },
        { action: 'payout', riskScore: 10, lastAuthAgeSeconds: 9000, amr: ['pwd'] },
        POLICY,
      );
      expect(result.decision).to.equal('deny:sms-not-allowed-for-payout');
    },
  },
  {
    name: 'accepts SMS step-up for a non-payout action where policy explicitly allows it',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: false, hasTotp: false, hasSms: true },
        { action: 'view', riskScore: 95, lastAuthAgeSeconds: 9000, amr: ['pwd'] },
        POLICY,
      );
      // 'view' is normally low-risk, but riskScore (95) is above POLICY.riskScoreThreshold (80),
      // making this a high-risk decision even though 'view' isn't in highRiskActions.
      expect(result.decision).to.equal('step-up:sms');
    },
  },
  {
    name: 'denies account recovery with fewer than two enrolled factors',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: true, hasTotp: false, hasSms: false },
        { action: 'recover-account', riskScore: 50, lastAuthAgeSeconds: 0, amr: [] },
        POLICY,
      );
      expect(result.decision).to.equal('deny:recovery-requires-two-factors');
    },
  },
  {
    name: 'requires a second factor this session for recovery when two are enrolled but only one has been used',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: true, hasTotp: true, hasSms: false },
        { action: 'recover-account', riskScore: 50, lastAuthAgeSeconds: 0, amr: ['pwd'] },
        POLICY,
      );
      expect(result.decision).to.equal('step-up:passkey');
    },
  },
  {
    name: 'allows account recovery once two factors are enrolled and two amr entries were satisfied this session',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'grace@startup.dev', hasPasskey: true, hasTotp: true, hasSms: false },
        { action: 'recover-account', riskScore: 50, lastAuthAgeSeconds: 0, amr: ['pwd', 'webauthn'] },
        POLICY,
      );
      expect(result.decision).to.equal('allow');
    },
  },
  {
    name: 'every decision includes a non-empty human-readable reason',
    run: async ({ mod, expect }) => {
      const { authPolicy } = mod as unknown as Mod;
      const result = authPolicy(
        { email: 'ada@acme.com', hasPasskey: true, hasTotp: false, hasSms: false },
        { action: 'login', riskScore: 5, lastAuthAgeSeconds: 0, amr: [] },
        POLICY,
      );
      expect(result.reason).to.be.a('string');
      expect(result.reason.length).to.be.greaterThan(0);
    },
  },
];
