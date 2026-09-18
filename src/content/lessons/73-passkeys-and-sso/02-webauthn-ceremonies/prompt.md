# Build the relying-party side of WebAuthn, minus the crypto

`App.tsx` has four functions to implement. None of them touch a real
authenticator or verify a signature -- that's `crypto.subtle` work a vetted
library like SimpleWebAuthn should do. What you're building is the plain-object
shapes a relying party sends to the browser, and the plain-object checks it
runs on what comes back.

## 1. `buildRegistrationOptions(input)`

Build a `PublicKeyCredentialCreationOptions`-shaped object:

- `pubKeyCredParams`: exactly `[{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }]` --
  ES256 (`-7`) before RS256 (`-257`).
- `authenticatorSelection.residentKey` and `.userVerification` default to
  `'preferred'` when not given in `input`.
- `attestation` is always `'none'`.
- `excludeCredentials`: map `input.existingCredentialIds` to
  `{ type: 'public-key', id }`.
- `timeout`: any positive number (60000 is a reasonable default).

## 2. `buildAuthenticationOptions(input)`

Build `{ publicKey, mediation }` for `navigator.credentials.get({ publicKey, mediation })`:

- `mediation` defaults to `'optional'` when not given.
- **When `mediation === 'conditional'`, `publicKey.allowCredentials` must be
  `[]`, even if `input.allowCredentials` is non-empty.** Conditional UI
  (passkey autofill) works off discoverable credentials the browser looks up
  itself; sending a credential list defeats that.
- Otherwise, map `input.allowCredentials` to `{ type: 'public-key', id }`.

## 3. `verifyClientData(clientDataJSONBase64url, expectations)`

Base64url-decode and `JSON.parse` the payload (a `base64UrlDecode` helper is
already in the file). Never throw -- if decoding or parsing fails, return
`{ ok: false, errors: ['malformed clientDataJSON'] }`. Otherwise, check
**every** applicable rule and collect every failure (don't stop at the
first one):

- `type` must equal `expectations.expectedType` (`'type mismatch'`).
- `challenge` must equal `expectations.expectedChallenge` (`'challenge mismatch'`).
- `origin` must be in `expectations.expectedOrigins` (`'origin not allowed'`).
- If `crossOrigin === true` and `expectations.allowCrossOrigin` is not set,
  that's `'cross-origin not allowed'`.

`ok` is `true` only when `errors` is empty.

## 4. `parseAuthenticatorFlags(byte)`

Decode the single flags byte from `authenticatorData` using this bit layout
(WebAuthn Level 3): `UP = 0x01`, `UV = 0x04`, `BE = 0x08`, `BS = 0x10`,
`AT = 0x40`, `ED = 0x80`. Return
`{ userPresent, userVerified, backupEligible, backupState, attestedCredentialData, extensionData }`.

All four functions are exported and called directly by the checks -- you
don't need to change `App`.
