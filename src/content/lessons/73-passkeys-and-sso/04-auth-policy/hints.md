Start with `const domain = emailDomain(user.email);` (the helper's already in
the file) and check `policy.enterpriseDomains.includes(domain) && !user.ssoProvider`
first, returning `sso-required` immediately if true -- everything else only
runs once that check has passed.

---

For recovery, compute `const count = [user.hasPasskey, user.hasTotp, user.hasSms].filter(Boolean).length;`
before branching. Remember `context.amr` is the *session's* verified methods,
separate from which factors are merely *enrolled* -- a user can have two
factors enrolled but have only used one of them so far this session.

---

Compute `isHighRisk` as one boolean before anything else in this branch:
`policy.highRiskActions.includes(context.action) || context.riskScore >= policy.riskScoreThreshold`.
If it's `false`, return `allow` immediately and skip the rest of the function.

---

The fallback chain for a high-risk action, once the fresh-`webauthn` check
fails, is a sequence of `if` returns, not a single expression: passkey, then
totp, then (only for `payout`) the hardcoded deny, then the
`smsStepUpActions` check, then the final catch-all deny. Order matters --
check `hasPasskey` and `hasTotp` *before* the payout-specific SMS deny, so a
payout attempt from a user who *does* have a passkey or TOTP still gets a
normal step-up rather than an unconditional deny.
