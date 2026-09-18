import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'passkeys-and-sso-quiz',
  title: 'Quiz: passkeys and SSO',
  questions: [
    {
      id: 'why-passkeys-resist-phishing',
      prompt:
        'A security team says: "Push-based MFA with number matching and passkeys are both phishing-resistant, so it doesn\'t matter which one we roll out." Is that right?',
      choices: [
        {
          id: 'a',
          text:
            "No -- a real-time adversary-in-the-middle proxy can still relay a push-with-number-matching prompt to the real site while the victim is on a fake one, because the human is the one deciding to approve it and has no way to know the request actually originated from an attacker's session; a passkey assertion is cryptographically bound to the origin that requested it, so the authenticator itself refuses to sign for the attacker's domain -- no human judgment call involved.",
        },
        {
          id: 'b',
          text: "Correct -- both require the user to actively approve something, so both are equally resistant to real-time relay attacks.",
        },
        { id: 'c', text: 'Push-based MFA is actually stronger, because it doesn\'t depend on the device having biometric hardware.' },
        { id: 'd', text: "Neither is phishing-resistant; that term only applies to hardware security keys, not software-based factors." },
      ],
      correctChoiceId: 'a',
      explanation:
        "\"Phishing-resistant\" has a specific technical meaning: the credential is bound to the origin at the protocol level, so no amount of user deception can make it produce a valid response for the wrong site. Push and number-matching still route the decision through a human looking at a screen, which real-time AiTM phishing kits have automated defeating at scale. WebAuthn's origin binding removes the human judgment call from the security boundary entirely.",
    },
    {
      id: 'synced-vs-device-bound-tradeoff',
      prompt:
        "A fintech's compliance team pushes back on allowing synced (cloud-backed) passkeys for approving payouts, insisting on device-bound hardware keys instead, even though synced passkeys are also phishing-resistant. What's the actual, defensible reason for that distinction?",
      choices: [
        { id: 'a', text: "Synced passkeys aren't phishing-resistant; only hardware keys are." },
        {
          id: 'b',
          text:
            "A synced passkey's private key material is, by design, escrowed and distributable through a cloud account (iCloud Keychain, Google Password Manager, etc.), so its security now also depends on that cloud account's own security -- a device-bound key never leaves one piece of hardware, which is a meaningfully different, and for some compliance regimes required, threat model even though both resist phishing equally well.",
        },
        { id: 'c', text: "There's no real difference; this is compliance theater with no technical basis." },
        { id: 'd', text: 'Device-bound keys are required because synced passkeys don\'t support userVerification: "required".' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Phishing resistance and key portability are two separate properties. Synced passkeys solve the real usability problem of device-bound credentials (losing your only device loses your credential) by trading it for dependence on the cloud account's own security -- exactly the property some regulated contexts (and government/high-assurance FIDO2 profiles) still explicitly disallow, independent of phishing resistance.",
    },
    {
      id: 'saml-still-matters',
      prompt:
        "A junior engineer asks: \"OIDC is JSON over HTTPS and SAML is signed XML from 2005 -- why would we ever build SAML support in 2026 instead of just doing OIDC everywhere?\" What's the actual answer?",
      choices: [
        { id: 'a', text: "There's no good reason; any customer still asking for SAML is behind the times and should be told no." },
        {
          id: 'b',
          text:
            "Because large enterprise IT departments standardized their identity infrastructure on SAML years before OIDC existed, and re-integrating every SaaS vendor's SSO connection to a different protocol is not a project they take on for elegance -- to close those deals, most B2B products support both, often through an abstraction layer, rather than picking the technically nicer protocol and refusing the other.",
        },
        { id: 'c', text: 'SAML is required by law for any application handling PII in the United States.' },
        { id: 'd', text: 'OIDC cannot express group/role attributes the way SAML assertions can, so SAML is technically necessary for RBAC.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is a sales and integration-inertia reality, not a technical limitation of OIDC. Enterprises don't re-architect their IdP integrations to match a vendor's protocol preference; a B2B product that wants those deals supports whatever the customer's IdP actually speaks, which in a large fraction of enterprises is still SAML.",
    },
    {
      id: 'idp-initiated-risk',
      prompt:
        "A team supports both SP-initiated and IdP-initiated SAML SSO. A security reviewer flags the IdP-initiated path as needing extra scrutiny. What's the specific risk that SP-initiated flows don't have?",
      choices: [
        {
          id: 'a',
          text:
            "An IdP-initiated assertion arrives unsolicited -- there's no prior request from the SP to correlate it against (no InResponseTo to check), so a captured, still-valid assertion is more directly replayable unless the SP enforces a tight validity window and a replay cache; SP-initiated flows have a request to match the response against, closing that gap.",
        },
        { id: 'b', text: "IdP-initiated SSO doesn't support signed assertions, so it's inherently unauthenticated." },
        { id: 'c', text: "IdP-initiated flows always skip MFA at the identity provider, regardless of its configuration." },
        { id: 'd', text: "There's no real difference; the flag is outdated guidance from pre-2015 SAML deployments." },
      ],
      correctChoiceId: 'a',
      explanation:
        "The absence of a preceding AuthnRequest is exactly what makes IdP-initiated flows riskier to accept carelessly: there's nothing on the SP side to check the assertion against except the assertion's own timestamps and audience restriction. It's a normal, supported flow -- Okta app-dashboard tiles use it constantly -- but it needs tighter replay and expiry handling than a flow the SP itself kicked off.",
    },
    {
      id: 'scim-vs-jit',
      prompt:
        "A company's SSO integration only does JIT (just-in-time) provisioning on login -- no SCIM. Their security team says this is a real gap for enterprise customers, even though login clearly still works. Why?",
      choices: [
        {
          id: 'a',
          text: 'JIT provisioning is insecure by design and creates accounts with excessive default permissions.',
        },
        {
          id: 'b',
          text:
            "JIT only creates or updates an account the moment someone logs in -- it does nothing when HR deactivates that person in the IdP. Enterprises expect offboarding through their IdP to instantly cut off every connected app; without SCIM (or an equivalent deprovisioning push), a fired employee's account in this app stays fully active until someone remembers to disable it manually, which defeats the entire pitch of SSO as a single kill switch.",
        },
        { id: 'c', text: 'JIT provisioning cannot work with SAML, only with OIDC, so it\'s an architectural dead end.' },
        { id: 'd', text: 'This is only a gap for companies with more than 10,000 employees.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "SSO's core enterprise value proposition is centralized, instant offboarding -- deactivate once at the IdP, locked out everywhere. JIT provisioning only handles the create side of the lifecycle. Without SCIM's push-based deprovisioning, an app has no way to learn someone left the company except the next time that person tries (and fails, or worse, succeeds) to log in.",
    },
    {
      id: 'recovery-weak-point',
      prompt:
        "A team has rolled out passkeys, phishing-resistant step-up for payouts, and SSO with SCIM deprovisioning. Their account-recovery flow (for \"I lost my phone and my passkey\") is: verify the email address, then answer their date of birth. Is the rest of this system's hardening meaningful?",
      choices: [
        {
          id: 'a',
          text: 'Yes -- recovery is a separate, lower-stakes path that doesn\'t affect the security of normal login or step-up.',
        },
        {
          id: 'b',
          text:
            "Not really -- an attacker who can access the email inbox (itself often protected by weaker or reused credentials) and find or guess a date of birth can walk straight past every passkey and step-up control by going through recovery instead of the front door; recovery has to be at least as strong as the paths it's meant to be a fallback for, or it becomes the actual path an attacker takes.",
        },
        { id: 'c', text: 'It\'s fine as long as the date of birth is stored hashed in the database.' },
        { id: 'd', text: 'Recovery flows are exempt from this concern because they require possession of the registered email account.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Recovery exists specifically to work when the strong factors are gone, which makes it the path of least resistance for an attacker who can't beat the strong factors directly. Every layer of hardening described in this lesson is only as strong as the weakest way to bypass it -- and a weak recovery flow is consistently that weakest way in real incidents, regardless of how strong normal login is.",
    },
  ],
};
