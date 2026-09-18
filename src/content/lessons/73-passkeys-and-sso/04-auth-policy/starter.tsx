import { useMemo } from 'react';

export type UserFactors = {
  email: string;
  hasPasskey: boolean;
  hasTotp: boolean;
  hasSms: boolean;
  /** Set when the current session was authenticated through an enterprise IdP. */
  ssoProvider?: string;
};

export type AuthActionContext = {
  action: 'login' | 'view' | 'payout' | 'change-email' | 'recover-account';
  /** 0 (lowest) to 100 (highest). */
  riskScore: number;
  lastAuthAgeSeconds: number;
  /** Authentication Methods References already satisfied this session, e.g. ['pwd', 'otp'] or ['webauthn']. */
  amr: string[];
};

export type AuthPolicy = {
  /** Email domains whose users must authenticate through SSO, never a local password/passkey. */
  enterpriseDomains: string[];
  /** Actions that require a recently-verified phishing-resistant factor. */
  highRiskActions: string[];
  /** A risk score at or above this also counts an action as high-risk, regardless of highRiskActions. */
  riskScoreThreshold: number;
  /** How recent a 'webauthn' amr entry must be (lastAuthAgeSeconds) to skip step-up on a high-risk action. */
  stepUpWindowSeconds: number;
  /** Actions where SMS-based step-up is acceptable when no stronger factor is enrolled. Never consulted for 'payout'. */
  smsStepUpActions: string[];
};

export type PolicyDecision = { decision: string; reason: string };

function emailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

// TODO: implement the rules described in prompt.md, in order:
// 1. enterprise-domain users without an active SSO session -> 'sso-required'
// 2. account recovery needs >= 2 enrolled factors, and >= 2 amr entries this session
// 3. a high-risk action (explicit list, or riskScore >= threshold) needs a fresh
//    'webauthn' amr entry, else falls back to step-up:passkey / step-up:totp / deny
// 4. SMS never satisfies step-up for 'payout', regardless of smsStepUpActions
export function authPolicy(user: UserFactors, context: AuthActionContext, policy: AuthPolicy): PolicyDecision {
  return { decision: 'allow', reason: 'not implemented yet' };
}

const SAMPLE_POLICY: AuthPolicy = {
  enterpriseDomains: ['acme.com'],
  highRiskActions: ['payout', 'change-email'],
  riskScoreThreshold: 80,
  stepUpWindowSeconds: 300,
  smsStepUpActions: ['view', 'change-email'],
};

export default function App() {
  const decisions = useMemo(
    () => [
      authPolicy(
        { email: 'ada@acme.com', hasPasskey: true, hasTotp: false, hasSms: false },
        { action: 'login', riskScore: 10, lastAuthAgeSeconds: 0, amr: [] },
        SAMPLE_POLICY,
      ),
      authPolicy(
        { email: 'grace@startup.dev', hasPasskey: false, hasTotp: true, hasSms: true },
        { action: 'payout', riskScore: 40, lastAuthAgeSeconds: 9000, amr: ['pwd'] },
        SAMPLE_POLICY,
      ),
    ],
    [],
  );

  return <pre>{JSON.stringify(decisions, null, 2)}</pre>;
}
