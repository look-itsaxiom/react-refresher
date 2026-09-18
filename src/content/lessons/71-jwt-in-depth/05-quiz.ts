import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'jwt-in-depth-quiz',
  title: 'Quiz: JWT in depth',
  questions: [
    {
      id: 'alg-confusion-public-key',
      prompt:
        "Your API is configured with an issuer's RS256 public key to verify tokens. An attacker crafts a token with header `{\"alg\":\"HS256\"}`, HMAC-signs it using the RSA public key's PEM text as the secret, and sends it. Your verifier is configured to 'use whatever alg the token specifies.' What happens?",
      choices: [
        { id: 'a', text: "Verification fails, because a public key can't be used as an HMAC secret." },
        {
          id: 'b',
          text:
            "Verification can succeed: the verifier reads alg: HS256 from the token, computes an HMAC using the (public, and therefore attacker-known) key text as the secret, and it matches -- the attacker forged a valid-looking token for an issuer that only ever meant to sign with RS256.",
        },
        { id: 'c', text: "The token is rejected at the 'typ' check before alg is ever read." },
        { id: 'd', text: 'This only works if the attacker also knows the RSA private key.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the classic RS256-to-HS256 algorithm confusion attack: a public key is, by definition, not secret, so using it as an HMAC secret is possible for anyone who has it. The vulnerability is entirely in the verifier trusting the token's own alg field to decide the verification method -- the fix is for the verifier's configuration, not the token, to pin exactly one algorithm (or an explicit allowlist) per key.",
    },
    {
      id: 'kid-as-lookup-key',
      prompt:
        "A team implements JWKS key lookup as `readFileSync(`./keys/${header.kid}.pem`)` -- reading a PEM file whose name comes directly from the token's `kid` header. What's the actual risk, and what's the fix?",
      choices: [
        { id: 'a', text: 'No real risk -- kid values are always short alphanumeric strings by convention.' },
        {
          id: 'b',
          text:
            "kid is attacker-controlled input inside every token, so a crafted value like '../../etc/passwd' or one containing SQL turns key lookup into path traversal or injection; the fix is validating kid against a fixed, known set of ids (the JWKS you fetched from the issuer) rather than interpolating it directly into a path or query.",
        },
        { id: 'c', text: "It's a risk only for RS256 tokens, not HS256, so HMAC-only services are unaffected." },
        { id: 'd', text: 'Escaping the kid string with encodeURIComponent fully closes this off.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "kid comes from inside the token itself -- exactly as attacker-controlled as any other header field. Treating it as a safe filename or query fragment is the mistake; treating it as untrusted input to be checked against a known allowlist of key ids is the fix, independent of which signing algorithm is in play.",
    },
    {
      id: 'refresh-rotation-double-submit',
      prompt:
        "A mobile app sometimes retries a network request that actually succeeded server-side (the response was lost, not the request). Under strict refresh-token rotation with reuse detection, the client rotates a token, the response is lost, the client retries rotate() with the SAME old token. What happens, and is that a bug in the rotation scheme?",
      choices: [
        {
          id: 'a',
          text:
            "This looks exactly like an attacker replaying a stolen token, so the second call is legitimately flagged as reuse and the family is revoked -- that's a real, known cost of strict single-use rotation, not a bug in the reuse-detection logic; it's a client retry pattern that has to be designed around (e.g. idempotency keys, or a short grace window that still logs the event), not something a compliant server should special-case away silently.",
        },
        { id: 'b', text: "The server can tell it's a retry from the User-Agent header and skip reuse detection." },
        { id: 'c', text: 'Rotation should never revoke a family on the first reuse, only after three reuses, to absorb retries.' },
        { id: 'd', text: 'This scenario is impossible because refresh tokens are idempotent by spec.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Strict single-use rotation cannot distinguish "attacker replayed a stolen token" from "my own client retried a lost response" -- both look identical from the server. This is a real design tension in RFC 9700-style rotation, and systems that need to tolerate flaky networks add idempotency keys or a narrow grace window as a deliberate, logged exception, not by weakening reuse detection itself.',
    },
    {
      id: 'jwt-as-session-role-change',
      prompt:
        "A React app stores a user's role (`admin` or `member`) as a JWT claim, and the access token is valid for 8 hours. An admin demotes a user to `member` mid-session. What's true about that user's existing access token?",
      choices: [
        {
          id: 'a',
          text:
            "It keeps verifying successfully and keeps carrying role: 'admin' in its claims until it expires -- up to 8 hours later -- because the signature only guarantees the token wasn't altered since issuance, not that its claims still reflect current reality; anything checking authorization purely off the token's claims will honor the stale role for that whole window.",
        },
        { id: 'b', text: "It's automatically invalidated the moment the database role changes, since JWTs are always checked against the source of truth on every request." },
        { id: 'c', text: 'The next request will fail signature verification because the claims no longer match the server state.' },
        { id: 'd', text: 'This only affects RS256 tokens; HS256 tokens re-derive claims from the server on each use.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the core JWT-as-session pitfall: claims are frozen at issuance and a valid signature says nothing about whether they're still current. The mitigations are the same ones covered for revocation generally -- keep access-token lifetimes short, and back anything security-critical (like a role demotion that must take effect immediately) with a denylist check or a server-side lookup rather than trusting the token's claim alone.",
    },
    {
      id: 'client-side-jwt-decode-verified',
      prompt:
        "A frontend engineer says: 'I switched from `jwt-decode` to manually verifying the ID token's signature in the browser with the issuer's public key via `crypto.subtle`, using it to decide whether to show the admin nav link.' Is verifying the signature client-side enough to make that authorization decision safe?",
      choices: [
        {
          id: 'a',
          text:
            'Yes -- once the signature is verified, the claims are cryptographically guaranteed and safe to act on anywhere, client or server.',
        },
        {
          id: 'b',
          text:
            "No -- verifying in the browser only proves the token wasn't tampered with in transit to the browser; it does nothing to stop the user from calling the API directly with a token that lacks the admin role, or from modifying client-side JS to skip the check entirely. Showing/hiding a nav link based on it is fine as a UI convenience, but the API must independently verify and authorize every request regardless of what the client decided to render.",
        },
        { id: 'c', text: "It's unsafe specifically because crypto.subtle can't verify RS256 signatures in a browser." },
        { id: 'd', text: 'It becomes safe only if the verification result is cached in localStorage for reuse.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Client-side verification changes nothing about the trust boundary: the browser and its JavaScript are entirely under the end user's control. A verified signature tells the browser the token came from the real issuer, which is useful for deciding what to render -- it is never a substitute for the server independently verifying and authorizing every request it receives.",
    },
    {
      id: 'opaque-vs-jwt-tradeoff',
      prompt:
        'A team building an internal admin tool needs "revoke this session immediately, no exceptions" as a hard requirement -- security incidents there must take effect within seconds, not minutes. They are deciding between JWT access tokens with a denylist, and opaque tokens with server-side introspection on every request. Which consideration should weigh most heavily?',
      choices: [
        {
          id: 'a',
          text: 'JWTs are always faster to verify, so they should default to JWTs and just set a very short exp, like 30 seconds, to approximate instant revocation.',
        },
        {
          id: 'b',
          text:
            "Given a hard, low-latency revocation requirement over avoiding a database round trip, opaque tokens with introspection are the more direct fit -- deleting the token's row makes it dead immediately with no propagation delay, whereas a JWT-plus-denylist approach still depends on the denylist being checked everywhere consistently and adds the exact database read introspection needs anyway, without JWT's usual stateless-scaling benefit to show for it.",
        },
        { id: 'c', text: 'Opaque tokens are strictly obsolete now that JWT is an RFC; introspection should be avoided in new systems.' },
        { id: 'd', text: 'This decision has no bearing on revocation speed -- both approaches revoke equally fast by design.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "JWT's main appeal -- avoiding a server round trip to check validity -- is exactly what a hard, immediate-revocation requirement gives up anyway once you add a denylist that must be consulted on every request. When instant revocation is the actual requirement, an opaque token with introspection is the more honest architecture: it's a database read either way, so it might as well be the simpler one.",
    },
  ],
};
