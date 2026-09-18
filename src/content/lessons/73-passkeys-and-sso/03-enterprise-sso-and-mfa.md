# Enterprise SSO and MFA in 2026

"SSO" in a consumer context usually means OAuth/OIDC social login (lesson
72). "SSO" in an enterprise sales conversation almost always means: an IT
admin at the customer's company wants their identity provider (Okta, Entra
ID, Google Workspace, PingOne) to be the *only* way into your app, so
offboarding an employee there instantly cuts off every SaaS tool they used.
That requirement — one org-wide kill switch — is what "enterprise SSO"
sells, and it's why B2B products treat it as a checkbox that unlocks deals,
not a nice-to-have.

## SAML is not dead, and OIDC didn't replace it here

OIDC (built on OAuth 2.1) is the better-designed protocol — JSON over
HTTPS, JWTs instead of signed XML — and it's what lesson 72 covers in
depth. But large enterprises standardized their identity infrastructure on
SAML 2.0 (finalized 2005) years before OIDC existed (2014), and switching an
org's IdP integration is not something IT departments do for elegance. In
2026, offering *only* OIDC still loses enterprise deals; most B2B products
support both, or route through an abstraction layer (WorkOS, or your own)
that speaks both to the customer's IdP and presents one internal interface
to your app.

A SAML flow trades an **assertion** — a signed XML document asserting "this
IdP authenticated this user, here are their attributes" — between an
**IdP** (identity provider, e.g. Okta) and an **SP** (service provider,
your app). Both sides exchange **metadata** (XML documents describing
endpoints, certificates, and supported bindings) once, out of band, when
the integration is set up. The assertion is signed (and sometimes
encrypted) with XML digital signatures, which is where SAML's reputation
for foot-guns comes from: XML canonicalization (turning semantically
equivalent XML into one canonical byte sequence before hashing) has a
history of parser bugs that let attackers wrap or inject unsigned content
around a validly-signed assertion ("XML signature wrapping"). This is a
solved problem in mature libraries, but it's exactly the kind of thing you
outsource to a vetted SAML library or an SSO-as-a-service vendor rather than
implementing from a spec PDF.

**SP-initiated**: the user starts at your app, clicks "Log in with SSO",
your app redirects to the IdP with a SAML `AuthnRequest`, the IdP
authenticates them and POSTs a signed assertion back to your app's ACS
(Assertion Consumer Service) URL. **IdP-initiated**: the user starts inside
their company's IdP portal (Okta's app dashboard) and clicks a tile for your
app; the IdP POSTs an unsolicited assertion straight to your ACS URL, with
no preceding request from you to correlate it against. IdP-initiated flows
are more convenient but historically riskier — without a request to match
against, a captured assertion is more replayable unless you enforce a tight
`NotOnOrAfter` window and a `InResponseTo`-free replay cache. Both flows are
normal; SP-initiated is the safer default to support first.

## Provisioning: who creates the account, and when

**JIT (just-in-time) provisioning**: the first time a user's SSO assertion
or ID token arrives with no matching account, you create one on the fly
from the attributes/claims in it. Simple, but means the account technically
exists for a few requests before you've done any other checks.

**SCIM (System for Cross-domain Identity Management)**: the IdP pushes
user lifecycle events — create, update, deactivate — to a SCIM endpoint your
app exposes, independent of any login. This is what makes offboarding
instant: HR deactivates someone in the IdP, SCIM fires a deactivate call,
your app locks the account before that person ever tries to log in again.
Enterprise customers increasingly require SCIM, not just SAML/OIDC login,
specifically for this reason — login-time JIT provisioning alone doesn't
deprovision anyone.

Multi-tenant apps also need **domain-based IdP routing**: given an email
address or a subdomain, look up which IdP configuration applies before
starting the SSO redirect, because you're federating with many customers'
IdPs, not one.

## MFA: what's actually strong in 2026

Ranked roughly weakest to strongest against a motivated phishing attacker:

- **SMS/voice OTP.** Vulnerable to SIM swapping and, increasingly, to
  real-time phishing proxies that relay the code the instant a victim types
  it. Still common because it needs no app install, but NIST and most
  security-mature IdPs treat it as the fallback of last resort, not a
  first-class factor.
- **TOTP (authenticator apps).** Immune to SIM swap, but still phishable in
  real time by a proxy site that relays the code within its ~30-second
  window (the same class of attack that AiTM — adversary-in-the-middle —
  phishing kits automate at scale).
- **Push with number matching.** Better than a bare "approve/deny" push
  (which trained users to tap-approve MFA fatigue prompts) because the user
  has to read a number on the login screen and enter it in the push
  notification, adding a small but real speed bump against blind
  approval-spam attacks.
- **Passkeys / hardware security keys.** Phishing-resistant by construction
  (see concept 1) — there is no code or push to relay, because the
  authenticator won't sign for the wrong origin at all. This is the factor
  identity vendors are steering customers toward, and several large
  identity providers reported material year-over-year growth in passkey
  sign-ins through 2025 into 2026, though exact adoption percentages vary
  by vendor report and should be treated as directional, not precise.

## Step-up authentication

Not every action needs the same bar. OIDC exposes this through `acr`
(Authentication Context Class Reference — a claim describing *how* the user
authenticated) and `amr` (Authentication Methods References — *which*
methods were used, e.g. `["pwd", "otp"]` or `["webauthn"]`). A request can
ask for a specific `acr_values`, and an app can check the `amr` and
`auth_time` on the resulting token to decide whether a sensitive action
(changing a payout destination, viewing PII) needs a fresh, stronger
re-authentication before proceeding — "step-up" — rather than trusting
however the user logged in an hour ago. This is the same shape of decision
the exercise in this lesson builds as a plain policy function.

## The recovery flow is the real attack surface

Every hardening above is regularly undone by account recovery: "lost your
passkey and your phone? Verify your identity by email + date of birth" is
frequently the *weakest* link in an otherwise strong system, because
recovery exists precisely to work when the strong factors are unavailable.
Treat recovery as security-critical design, not a support afterthought:
require multiple independent factors, rate-limit and monitor it more
aggressively than normal login, and never let a single weak signal
(possession of an email inbox) both authenticate *and* be the account you're
protecting.

## Buy vs. build

Building SAML and OIDC federation, SCIM, and passkeys correctly is a
multi-quarter effort with a security blast radius if you get it wrong.
WorkOS, Auth0, Okta (as a customer-facing IdP-of-IdPs via its "Okta
Workforce/Customer Identity" products), Entra External ID, and Clerk's
enterprise tier all exist specifically to let a product team offer "SSO"
and "SCIM" as a checkbox without owning SAML XML parsing. Most teams past
seed stage buy this layer and spend their engineering time on the product,
not the identity plumbing.

## Further reading

- [SAML 2.0 Technical Overview — OASIS](https://www.oasis-open.org/committees/download.php/56776/sstc-saml-tech-overview-2.0-cd-02.pdf)
- [WorkOS: SP-initiated vs IdP-initiated SSO](https://workos.com/blog/sp-initiated-vs-idp-initiated-sso)
- [SCIM RFC 7644](https://www.rfc-editor.org/rfc/rfc7644)
- [NIST SP 800-63B — Authentication and Lifecycle Management](https://pages.nist.gov/800-63-3/sp800-63b.html)
