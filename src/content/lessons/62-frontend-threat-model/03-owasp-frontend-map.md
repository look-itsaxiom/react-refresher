## Mapping OWASP to the frontend

OWASP's Top 10 is written for whole applications, backend included. Read it as a
frontend engineer and most categories are still yours, just wearing a different name —
and knowing which ones are entirely someone else's job (and which are secretly still
yours) is most of what "threat model" means in practice.

### The Top 10 (2025 revision), frontend-translated

OWASP refreshed the list in 2025; the biggest structural changes from the 2021 edition
are a broadened supply-chain category and a new category for how code handles failure.
Read each one against your own stack:

- **A01 Broken Access Control** — on the frontend this shows up as hiding a button
  instead of checking a permission. Disabling the "delete" action in the UI is UX, not
  a security control; the same check has to run again wherever the mutation actually
  happens, because anyone can call your API with `curl` and skip the button entirely
  (this is the exact framing lesson 22 uses for Server Functions: every one is a public
  endpoint).
- **A02 Security Misconfiguration** — missing or wrong CSP, permissive CORS, no
  `Secure`/`HttpOnly`/`SameSite` on session cookies, verbose error pages left on in
  production, a default admin route left reachable. Almost every header lesson later in
  this track (64-67) is a misconfiguration risk in this category.
- **A03 Software Supply Chain Failures** — 2025's broadened version of "vulnerable and
  outdated components." It now explicitly covers compromised packages, malicious
  maintainer takeovers, and build/CI pipeline tampering, not just *old* dependencies.
  Lesson 68 covers this in depth; the case studies below are exactly this category.
- **A04 Cryptographic Failures** — mostly a backend/transport concern, but relevant to
  the frontend anywhere you roll your own "encryption" in JavaScript (client-side crypto
  can't keep a secret from a user who controls the runtime it executes in) or store a
  secret where JS can read it.
- **A05 Injection** — XSS is injection into the DOM/JS execution context instead of a
  database. Lesson 63 is the deep dive.
- **A06 Insecure Design** — a flaw in the intended flow, not a coding bug: an OAuth
  redirect that trusts a query param, a password reset that emails the new password
  instead of a link, a "remember me" that never expires. No header fixes this; it has to
  be caught before the feature ships, which is the entire argument for threat modeling
  as a habit rather than a one-time audit.
- **A07 Authentication Failures** — session fixation, tokens that never expire,
  predictable session identifiers, no lockout on repeated failed logins. Lessons 69-73
  cover the frontend's half of this.
- **A08 Software or Data Integrity Failures** — deserializing or executing data you
  didn't verify: an unsigned auto-update, a CI pipeline that pulls a build script from an
  untrusted source, `postMessage` payloads trusted without checking `event.origin`.
- **A09 Logging & Alerting Failures** — usually backend, but the frontend contributes
  when it swallows errors silently (a failed auth check that just falls through) instead
  of surfacing something someone will see.
- **A10 Mishandling of Exceptional Conditions** — new in 2025: unhandled promise
  rejections, error boundaries that fail open (rendering the protected content instead of
  a fallback), catch blocks that resume a privileged code path after failure instead of
  denying by default.

Alongside the main Top 10, the **OWASP Top 10 Client-Side Security Risks** list exists
specifically because a browser-first Top 10 orders things differently: DOM XSS, client-
side CSRF (a fetch/XHR site itself constructs and sends without a server-rendered form),
third-party JavaScript risk, client-side prototype pollution, and postMessage
misconfiguration all rank higher there than in the general-purpose list, because they
only exist in a browser execution context.

### Case studies: it keeps happening

**polyfill.io (June 2024).** Thousands of sites loaded `polyfill.io/v3/polyfill.min.js`
as a normal third-party script tag, trusting the CDN to keep serving the same
unmodified library. The domain was sold to a new owner, who started serving malware
(redirects to gambling and phishing sites) from the same URL, to the same script tags,
with no code change on the sites using it. The lesson isn't "polyfills are dangerous" —
it's that a `<script src="https://someone-else's-domain">` is a standing grant of trust
to whoever controls that domain *today*, not whoever controlled it when you added the
tag. Subresource Integrity (lesson 67) and self-hosting third-party scripts are the
direct mitigations.

**The npm supply-chain wave of September 2025.** Attackers compromised the npm account
of a widely-depended-on maintainer (via a phishing email impersonating npm support) and
published malicious versions of `chalk`, `debug`, and roughly a dozen other packages with
a combined multi-billion-weekly-download footprint, injecting code that hijacked
cryptocurrency transactions in the browser. Days later, a second, self-propagating
incident dubbed **Shai-Hulud** used stolen npm/GitHub tokens harvested from infected
machines to automatically publish trojanized versions of *further* packages those tokens
had access to — a worm that spread through the dependency graph itself rather than
through any single phishing target. Neither incident required a bug in your code: your
`package-lock.json` pinned a version, and that version's *contents* changed maliciously
underneath you when it got republished. Lesson 68 covers the mitigations (lockfiles that
pin by hash, install-script quarantine, provenance).

**The React Server Components RCE (December 2025, CVE-2025-55182).** A deserialization
flaw in how RSC's "flight" wire format reconstructs server-bound values from client
requests allowed a crafted request to achieve remote code execution on the server —
notable here because it's a vulnerability class (unsafe deserialization of client-
controlled input) that frontend engineers are used to worrying about only for things
like `JSON.parse`, and RSC's binary protocol made it a server-side concern with a
client-shaped trigger. It's the frontend-adjacent case for why "every Server Function is
a public endpoint" (lesson 22) has to include the framework's own transport, not just
your handler code.

### STRIDE-lite: threat-modeling a feature in ten minutes

You don't need a formal workshop to threat-model a feature. Before shipping, write down
four things and reason through STRIDE against each entry point:

1. **Assets** — what does this feature expose or let someone do? (a token, another
   user's data, the ability to trigger a payment)
2. **Entry points** — every place untrusted input reaches this feature (a form, a URL
   param, a `postMessage` listener, a third-party script, a WebSocket message)
3. **Trust boundaries** — where does data cross from "the user/network controls this" to
   "my code executes this"? (parsing a response, rendering into the DOM, evaluating a
   redirect URL)
4. **Third-party surface** — what does this feature load or call that you don't control?

Then, per entry point, ask which of **S**poofing, **T**ampering, **R**epudiation,
**I**nformation disclosure, **D**enial of service, and **E**levation of privilege apply,
and name a concrete control — not "be careful," but "validate `event.origin` before
trusting a `postMessage`" or "add SRI plus a CSP script-src that pins this host." This is
exactly the exercise ahead: turning a feature description into a ranked threat list
mechanically, the way a real review does it under time pressure.

### The habit: threat-model in the PR template

The single highest-leverage version of this is procedural, not technical: a checklist
item in your PR template — "does this change introduce a new entry point, a new
trust boundary, or a new third-party dependency?" — that forces the four questions above
before merge, not after an incident. The [Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/)
frames this well: threat modeling is a team practice done continuously as part of
building, not a gate a security team runs once against a finished design.

### Further reading (optional)

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Top 10 Client-Side Security Risks](https://owasp.org/www-project-top-10-client-side-security-risks/)
- [Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/)
- [OWASP: STRIDE-based threat modeling](https://owasp.org/www-community/Threat_Modeling_Process)
