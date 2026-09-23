# Passkeys: how WebAuthn actually works

A passkey is a public-key credential managed through the WebAuthn API
(`navigator.credentials.create` / `.get`), backed by FIDO2. The browser and OS
do the cryptography; your app never sees a private key, a password, or
anything else worth stealing. That's the whole pitch: there is no shared
secret in transit or at rest for an attacker to phish, replay, or leak from a
breached database. Everything else in this lesson is detail on top of that one
fact.

## Two ceremonies

**Registration** (`navigator.credentials.create({ publicKey })`): your server
generates a random `challenge` and sends a `PublicKeyCredentialCreationOptions`
object describing the relying party (`rp.id`, `rp.name`), the user, and which
algorithms it accepts (`pubKeyCredParams`, listing COSE algorithm identifiers
like `-7` for ES256). The authenticator — a platform authenticator (Touch ID,
Windows Hello, Android's screen lock) or a roaming one (a security key, or a
phone over the hybrid transport) — generates a fresh key pair, keeps the
private key, and returns the public key plus an *attestation* object. The
server stores the public key and a credential id against the user.

**Authentication** (`navigator.credentials.get({ publicKey })`): the server
sends a new challenge and (optionally) a list of credential ids it will
accept. The authenticator signs the challenge — plus a `clientDataJSON` blob
describing the request — with the stored private key. The server verifies
that signature against the public key it already has. Nothing about this
signing step touches the network in a phishable form: the signature is only
valid for the origin that requested it.

## Why it resists phishing

The browser binds every ceremony to the page's actual origin and includes it
in `clientDataJSON`. The authenticator also only ever signs for the relying
party id (`rp.id` at registration, `rpId` at authentication) it was
registered against — normally a registrable domain suffix of the origin, like
`example.com` covering `app.example.com`. A fake login page at
`examp1e.com` cannot produce a valid assertion for `example.com`, because
neither the browser nor the authenticator will let it request one. This is
the property passwords, OTP codes, and even push-based MFA lack: a human can
be tricked into typing a password or approving a push on the wrong site, but
they can't be tricked into producing a signature bound to a domain the
browser didn't actually navigate to. That's "phishing-resistant" as a
technical term, not marketing.

## Synced vs. device-bound

Apple, Google, and Microsoft now sync passkeys created on a platform
authenticator across a user's devices through their respective cloud key
chains (iCloud Keychain, Google Password Manager, Windows/Microsoft account
sync). This is what let "passkey" replace "FIDO2 credential" in consumer
language — the old device-bound model meant losing your phone meant losing
your credential, which enterprises still often want for compliance reasons.
A hardware security key (YubiKey and similar) remains device-bound by
design: the private key never leaves the token. Enterprises that require
phishing-resistant *and* non-exportable credentials (some government and
financial contexts) still mandate device-bound roaming authenticators rather
than trusting a consumer cloud sync fabric.

## User verification, presence, and `residentKey`

`userVerification` (`'required' | 'preferred' | 'discouraged'`) controls
whether the authenticator must confirm it's actually the enrolled human (Face
ID, a PIN, a fingerprint) versus merely present (a tap, with no biometric or
PIN check). `residentKey` (`'required' | 'preferred' | 'discouraged'`)
controls whether the credential is stored *on* the authenticator, discoverable
without the server first telling it which credential id to use. A resident
("discoverable") credential is what makes username-less login and
autofill-based login possible — the authenticator can enumerate its own
stored credentials for a given `rpId` without the server sending
`allowCredentials` first.

## Conditional UI (passkey autofill)

Calling `navigator.credentials.get({ publicKey, mediation: 'conditional' })`
against an `<input autocomplete="username webauthn">` field lets the browser
show matching passkeys in the normal autofill dropdown, with no separate UI
and no `allowCredentials` list (that would defeat the discoverable-credential
lookup). This is the UX pattern replacing "enter your email, then click Sign
in with a passkey": the user just clicks their email in the autofill
suggestions and completes the platform's biometric prompt.

## Cross-device and what the RP must verify

The hybrid transport (formerly "caBLE") lets a phone's passkey authenticate a
sign-in on a different device — a laptop shows a QR code, the phone scans it
over Bluetooth LE proximity plus an internet-relayed channel, and signs the
assertion locally. This is how a passkey on a phone can log in a desktop
browser that has no passkey of its own.

On every registration and authentication, the relying party (your backend,
usually via a library) must verify, at minimum: `clientDataJSON.type` matches
the ceremony (`webauthn.create` or `webauthn.get`), the challenge matches
what it issued and hasn't been reused, the origin is one it trusts, a hash of
`rp.id` appears in `authenticatorData`, the user-present (and, if required,
user-verified) flag is set, and — on authentication — the signature counter
either increased or the credential is marked as backed-up (synced passkeys
often report a counter of `0` forever, which is expected, not a downgrade
attack). Attestation (proving *which model* of authenticator created the
key) matters for enterprise fleets that whitelist hardware, but most
consumer-facing apps request `attestation: 'none'` and skip verifying it —
it adds privacy-invasive fingerprinting risk for little benefit when you
just want "a phishing-resistant credential exists," not "which vendor
made it."

## Building this without hand-rolling it

Nobody hand-verifies COSE public keys and CBOR-encoded attestation objects
in application code. [SimpleWebAuthn](https://simplewebauthn.dev/) is the
de facto open-source library for both browser and server sides; Auth0,
Okta, WorkOS, and Clerk all offer passkeys as a managed feature on top of
their existing session/OAuth infrastructure. The exercises in this lesson
build the *shapes* — the options objects sent to the browser, and the
plain-object verification a relying party does on `clientDataJSON` and
`authenticatorData` flags — without touching COSE parsing or signature
verification, which is exactly the boundary real teams draw between "we
understand this" and "a vetted library does this."

## Further reading (optional)

- [WebAuthn Level 3 — W3C Working Draft](https://www.w3.org/TR/webauthn-3/)
- [webauthn.io — interactive registration/authentication demo](https://webauthn.io/)
- [web.dev: Passkeys](https://web.dev/articles/passkey-registration)
- [SimpleWebAuthn documentation](https://simplewebauthn.dev/docs/)
