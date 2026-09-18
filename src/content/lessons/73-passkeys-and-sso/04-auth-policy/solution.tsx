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

/**
 * Decides the next authentication step for `user` attempting `context.action`
 * under `policy`. Rules, in order:
 *
 * 1. Enterprise-domain users without an active SSO session must go through SSO.
 * 2. Account recovery requires at least two enrolled factors, and verifying a
 *    second one this session (amr.length >= 2) before it's allowed.
 * 3. A high-risk action (listed explicitly, or above the risk-score threshold)
 *    requires a fresh phishing-resistant ('webauthn') factor. Falling back:
 *    a passkey the user can still register/use beats TOTP beats nothing.
 * 4. SMS is never an acceptable step-up factor for 'payout', regardless of
 *    policy.smsStepUpActions -- that's a hardcoded invariant, not a policy knob.
 */
export function authPolicy(user: UserFactors, context: AuthActionContext, policy: AuthPolicy): PolicyDecision {
  const domain = emailDomain(user.email);
  if (policy.enterpriseDomains.includes(domain) && !user.ssoProvider) {
    return { decision: 'sso-required', reason: `${domain} is an enterprise domain and must authenticate via SSO` };
  }

  if (context.action === 'recover-account') {
    const enrolledFactorCount = [user.hasPasskey, user.hasTotp, user.hasSms].filter(Boolean).length;
    if (enrolledFactorCount < 2) {
      return {
        decision: 'deny:recovery-requires-two-factors',
        reason: 'account recovery requires at least two enrolled factors',
      };
    }
    if (context.amr.length < 2) {
      const factor = user.hasPasskey ? 'passkey' : 'totp';
      return {
        decision: `step-up:${factor}`,
        reason: 'recovery requires verifying a second factor this session',
      };
    }
    return { decision: 'allow', reason: 'recovery verified with two factors this session' };
  }

  const isHighRisk = policy.highRiskActions.includes(context.action) || context.riskScore >= policy.riskScoreThreshold;
  if (!isHighRisk) {
    return { decision: 'allow', reason: 'no additional verification required for this action' };
  }

  const hasFreshPhishingResistantFactor =
    context.amr.includes('webauthn') && context.lastAuthAgeSeconds <= policy.stepUpWindowSeconds;
  if (hasFreshPhishingResistantFactor) {
    return { decision: 'allow', reason: 'a phishing-resistant factor was used within the step-up window' };
  }

  if (user.hasPasskey) {
    return { decision: 'step-up:passkey', reason: 'high-risk action requires a fresh phishing-resistant factor' };
  }
  if (user.hasTotp) {
    return {
      decision: 'step-up:totp',
      reason: "high-risk action requires step-up; TOTP is the strongest factor this user has enrolled",
    };
  }
  if (context.action === 'payout') {
    return {
      decision: 'deny:sms-not-allowed-for-payout',
      reason: 'SMS cannot satisfy step-up for payout actions, and no stronger factor is enrolled',
    };
  }
  if (user.hasSms && policy.smsStepUpActions.includes(context.action)) {
    return { decision: 'step-up:sms', reason: 'SMS is the only enrolled factor and is acceptable for this action' };
  }
  return { decision: 'deny:no-acceptable-factor', reason: 'no acceptable step-up factor is enrolled for this action' };
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
