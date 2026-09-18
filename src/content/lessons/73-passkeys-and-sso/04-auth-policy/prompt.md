# Implement `authPolicy`: a step-up authentication decision table

`App.tsx` has one function to implement: `authPolicy(user, context, policy)`.
Given a user's enrolled factors, the action they're attempting, and a policy
table, return the required next step as `{ decision, reason }`. Apply these
rules **in this order** -- each one can short-circuit the rest:

## 1. Enterprise SSO

If `user`'s email domain is in `policy.enterpriseDomains` and `user.ssoProvider`
is not set, return `{ decision: 'sso-required', reason: '...' }`. An
enterprise-domain user with an active SSO session (`ssoProvider` set) skips
this and falls through to the normal rules below.

## 2. Account recovery needs two factors, verified

When `context.action === 'recover-account'`:

- Count how many of `hasPasskey`, `hasTotp`, `hasSms` are `true`. Fewer than
  two enrolled factors -> `'deny:recovery-requires-two-factors'`.
- Two or more enrolled, but `context.amr.length < 2` (only one factor was
  actually used this session) -> step up with a second one:
  `` `step-up:${user.hasPasskey ? 'passkey' : 'totp'}` ``.
- Two or more enrolled, and `amr.length >= 2` -> `'allow'`.

## 3. High-risk actions need a fresh phishing-resistant factor

An action is high-risk if it's listed in `policy.highRiskActions`, **or**
`context.riskScore >= policy.riskScoreThreshold` (a risky session escalates
even an otherwise-ordinary action). For a high-risk action:

- If `context.amr` already includes `'webauthn'` **and**
  `context.lastAuthAgeSeconds <= policy.stepUpWindowSeconds`, that's already
  a fresh phishing-resistant factor -> `'allow'`.
- Otherwise, fall back to the strongest factor the user has enrolled:
  `user.hasPasskey` -> `'step-up:passkey'`; else `user.hasTotp` ->
  `'step-up:totp'`.
- If neither is enrolled **and** `context.action === 'payout'`, deny outright
  with `'deny:sms-not-allowed-for-payout'` -- SMS is never an acceptable
  step-up factor for a payout, whether or not it's in
  `policy.smsStepUpActions`. Check this before consulting
  `smsStepUpActions` at all.
- If neither is enrolled, the action isn't `'payout'`, the user has SMS, and
  the action is listed in `policy.smsStepUpActions` -> `'step-up:sms'`.
- Otherwise -> `'deny:no-acceptable-factor'`.

## 4. Anything else

Not high-risk, not recovery, no SSO requirement triggered -> `'allow'`.

`reason` should be a short, non-empty string explaining the decision -- exact
wording isn't checked, only that it's present.
