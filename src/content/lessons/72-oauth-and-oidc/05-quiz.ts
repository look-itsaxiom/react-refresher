import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'oauth-and-oidc-quiz',
  title: 'Quiz: OAuth 2.1 and OpenID Connect',
  questions: [
    {
      id: 'id-token-to-api',
      prompt:
        "A React app finishes an OIDC login and gets back both an access token and an ID token. The engineer wires the ID token into the Authorization header of every API call, since 'it has the user's identity in it.' What's wrong with this, if anything?",
      choices: [
        { id: 'a', text: "Nothing -- the ID token is signed, so it's just as valid a credential as the access token." },
        {
          id: 'b',
          text:
            "The ID token is meant for the client, not the API -- its audience is the client's own client_id, not the API, it typically carries no scope, and many providers explicitly document it as unfit for calling APIs. The access token is the one meant to be presented to a resource server; using the ID token there works only because nothing server-side is checking its audience, which is itself the bug waiting to be found.",
        },
        { id: 'c', text: 'This is fine as long as the API also validates the nonce claim on every request.' },
        { id: 'd', text: 'It only matters for public clients; confidential clients can use either token interchangeably.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is OAuth/OIDC's most common real-world mixup: authentication (who is this, established by the ID token) and authorization for an API call (what can this request do, established by the access token) are different concerns with different tokens. An API that doesn't check `aud` is trusting a token issued to prove something else entirely.",
    },
    {
      id: 'implicit-grant-why-removed',
      prompt:
        'OAuth 2.1 removes the implicit grant entirely rather than just discouraging it. What is the strongest technical reason for the removal, versus just historical caution?',
      choices: [
        { id: 'a', text: 'Implicit grant tokens use a weaker signing algorithm than authorization code grant tokens.' },
        {
          id: 'b',
          text:
            "The implicit grant returns the access token directly in the URL fragment with no code-exchange step, so the token ends up in browser history and referrer headers with no mechanism (like PKCE) to bind it to the client that requested it -- a risk that existed only because 2012-era browsers couldn't do reliable cross-origin POST, a constraint that no longer applies.",
        },
        { id: 'c', text: "It's removed purely for simplicity of the spec, not because of any specific vulnerability." },
        { id: 'd', text: 'Implicit grant tokens cannot carry an audience claim, making them unusable with modern APIs.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The implicit grant was a workaround for a browser limitation that no longer exists. Once cross-origin POST became reliable, there was no remaining reason to accept a flow that puts bearer tokens in URLs, browser history, and logs with no proof-of-possession mechanism -- the authorization code + PKCE flow does everything implicit did, more safely.',
    },
    {
      id: 'wildcard-redirect-uri',
      prompt:
        "A team registers `https://app.example.com/*` as their app's redirect URI with their identity provider, reasoning that it covers every route their app might redirect to. Their provider accepts the registration. What's the actual risk?",
      choices: [
        { id: 'a', text: 'None -- as long as the domain is correct, any path under it is equally trustworthy.' },
        {
          id: 'b',
          text:
            "A wildcard redirect URI widens the set of destinations an authorization code (or, worse, tokens) can be sent to beyond what the client controls precisely -- any open-redirect page, forgotten route, or attacker-findable path under that domain becomes a valid place for the AS to deliver a code, which OAuth 2.1 and RFC 9700 both close off by requiring exact string matching against a fixed, pre-registered URI.",
        },
        { id: 'c', text: 'The risk only applies to HTTP redirect URIs, not HTTPS ones.' },
        { id: 'd', text: 'This is safe specifically because PKCE already prevents any misuse of a stolen code.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "PKCE protects the code exchange step, not where the code gets delivered in the first place. A wildcard match means the AS will happily redirect a legitimate authorization code to any path under that host -- including one an attacker finds or creates (an open redirect, a forgotten debug route) to capture the code before the real app ever sees it. Exact matching is the actual defense here.",
    },
    {
      id: 'mix-up-attack-scenario',
      prompt:
        'A client integrates with two OIDC providers -- a production AS and a staging AS used for internal testing -- sharing one callback handler. What specifically makes this a mix-up attack risk, and what closes it?',
      choices: [
        { id: 'a', text: "It isn't actually a risk as long as both providers use HTTPS." },
        {
          id: 'b',
          text:
            "If the two authorization servers share a callback path, an attacker who controls (or compromises) one of them can redirect an authorization response meant for the other AS, and the client -- assuming responses only ever come from the AS it thinks it just redirected to -- can be tricked into sending an authorization code (or exchanging tokens) with the wrong AS's credentials. RFC 9207's iss parameter on the callback, checked against which AS the client actually expects, or using distinct redirect_uris per AS, closes it.",
        },
        { id: 'c', text: "It's not a real risk once PKCE is in use, since PKCE binds the code to the client regardless of which AS issued it." },
        { id: 'd', text: 'This only affects the implicit grant, which is already removed in OAuth 2.1.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "PKCE binds a code to the client that requested it, but says nothing about which authorization server the client believes it's talking to. Mix-up attacks exploit exactly that gap in multi-AS setups. RFC 9207's iss parameter (or, as a fallback, giving each AS its own distinct redirect_uri) lets the client confirm it's processing a response from the AS it actually meant to, not just any response with a valid-looking code.",
    },
    {
      id: 'localhost-redirect-exception',
      prompt:
        "A native app registers `http://127.0.0.1/callback` as its redirect URI, and at runtime the OS assigns it an ephemeral port, so the actual redirect goes to `http://127.0.0.1:61234/callback`. Under OAuth 2.1's exact-match redirect URI rule, why does this succeed instead of being rejected as a mismatch?",
      choices: [
        { id: 'a', text: "It doesn't succeed -- exact matching has no exceptions, and this registration would always fail at runtime." },
        {
          id: 'b',
          text:
            "RFC 8252 carves out a specific, narrow exception for native/CLI apps using loopback redirects: the AS is expected to ignore the port when comparing a loopback redirect_uri, because such an app genuinely cannot know its port in advance, while still requiring the scheme, host, and path to match exactly -- it is not a general exception for 'apps that can't predict their own URL.'",
        },
        { id: 'c', text: "It succeeds because 127.0.0.1 is treated as a wildcard host under OAuth 2.1." },
        { id: 'd', text: 'The port is actually part of the query string in this case, so it never affects host/path matching.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the one sanctioned, narrow exception to exact redirect URI matching, and it exists for a specific practical reason -- a native app run by the OS gets a dynamically assigned loopback port it can't register in advance. It's not a general loophole: scheme, host, and path still have to match exactly, and it doesn't extend to non-loopback hosts.",
    },
    {
      id: 'bff-vs-browser-held-tokens',
      prompt:
        "A team building a new internal SPA is deciding between (a) a backend-for-frontend that keeps tokens server-side and hands the browser only a session cookie, and (b) having the SPA run the authorization code + PKCE flow itself and hold tokens in memory. They have the engineering capacity to build either. Per the current browser-based-apps guidance, which should they default to, and why?",
      choices: [
        { id: 'a', text: 'Browser-held tokens, since PKCE makes the authorization code flow just as safe as a BFF once implemented correctly.' },
        {
          id: 'b',
          text:
            "The BFF, because it removes tokens from the browser's reach entirely -- the highest-impact mitigation against the risk that actually dominates SPA token handling, which is XSS. PKCE secures the code-exchange step of the flow, but it does nothing to protect a token that, once issued, sits in JS-accessible memory or storage inside a browser running the app's own (and any injected) JavaScript.",
        },
        { id: 'c', text: 'Neither -- token-mediating backends are the recommended default regardless of engineering capacity.' },
        { id: 'd', text: 'It makes no difference; the browser-based-apps guidance is only about which grant type to use, not where tokens are stored.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "PKCE and a BFF solve different problems. PKCE protects the exchange of an authorization code for tokens; it has nothing to say about what happens to a token afterward. The browser-based-apps ranking exists because, once a token reaches the browser, any XSS in the app (or a dependency) can read and exfiltrate it -- and a BFF is the only one of the three architectures that removes that risk entirely rather than mitigating it.",
    },
  ],
};
