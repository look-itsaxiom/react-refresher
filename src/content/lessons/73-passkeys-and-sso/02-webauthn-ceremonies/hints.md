`buildRegistrationOptions`: the `pubKeyCredParams` array is a fixed literal --
`[{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }]` -- it
doesn't depend on `input` at all. Use `input.residentKey ?? 'preferred'` and
`input.userVerification ?? 'preferred'` for `authenticatorSelection`.
`existingCredentialIds.map((id) => ({ type: 'public-key', id }))` for
`excludeCredentials`.

---

`buildAuthenticationOptions`: compute `mediation = input.mediation ?? 'optional'`
first, then branch: `mediation === 'conditional' ? [] : input.allowCredentials.map(...)`
for `allowCredentials`. Return the mediation value alongside `publicKey`, not
inside it -- `{ publicKey: {...}, mediation }`.

---

`verifyClientData`: wrap the decode+parse in `try`/`catch` and return the
malformed-payload result from the `catch` block. Build an `errors: string[] = []`
and `push` onto it for each failing rule instead of returning early, so
multiple problems can be reported together. For the origin check, guard
against a missing `origin` field too:
`!clientData.origin || !expectations.expectedOrigins.includes(clientData.origin)`.

---

`parseAuthenticatorFlags`: each field is `(byte & MASK) !== 0` for its bit --
`UP: 0x01`, `UV: 0x04`, `BE: 0x08`, `BS: 0x10`, `AT: 0x40`, `ED: 0x80`. There's
no dependency between fields; six independent bitwise-AND checks.
