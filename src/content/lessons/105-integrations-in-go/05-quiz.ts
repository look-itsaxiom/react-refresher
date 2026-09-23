import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'integrations-in-go-quiz',
  title: 'Quiz: Integrations in Go',
  questions: [
    {
      id: 'verify-order',
      prompt:
        'Your webhook handler currently checks the timestamp tolerance window before verifying the HMAC signature ("reject anything older than 5 minutes, then check the signature"). A teammate suggests swapping the order: verify the signature first, then check staleness. Why is that the better order?',
      choices: [
        { id: 'a', text: 'It is not -- the order makes no difference to security or correctness.' },
        {
          id: 'b',
          text:
            'Checking staleness first lets an attacker send requests with an arbitrary (and wrong) signature and still learn something about your tolerance window and clock from the response; checking the signature first means a request tells you nothing until it has already proven it was signed with a real secret.',
        },
        { id: 'c', text: 'Checking the signature first is faster because HMAC is cheaper to compute than a time comparison.' },
        { id: 'd', text: 'It only matters for GitHub webhooks, not Stripe-style ones.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Order matters whenever one check can leak information usable before the other check has passed. Verifying authenticity (the signature) before freshness (the timestamp) means an unauthenticated caller gets no signal beyond "your request was rejected" -- not which specific check failed or how close it came to passing.',
    },
    {
      id: 'idempotent-store',
      prompt:
        'A webhook handler calls `store.MarkProcessed(id)` immediately after verifying the signature, before calling `process(event)`. `process` then fails with a network error talking to a downstream service. What happens the next time the provider redelivers this exact event (same id)?',
      choices: [
        { id: 'a', text: 'process runs again, exactly as intended, because MarkProcessed is idempotent.' },
        {
          id: 'b',
          text:
            'The handler sees the id already marked processed and skips process entirely -- the event is now permanently stuck: it never succeeded, but the store believes it did, so no future redelivery will ever retry it.',
        },
        { id: 'c', text: 'The provider detects the failure via your response code and stops sending this event.' },
        { id: 'd', text: 'MarkProcessed automatically rolls back once it detects the downstream failure.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the ordering bug the lesson's exercise is built around: marking-as-processed and doing-the-processing are two separate events, and whichever one you do first determines what a failure between them does. Mark first, and a failure silently and permanently drops the work. Process first and mark only on success, and a failure just means the next (harmless, expected) redelivery retries cleanly.",
    },
    {
      id: 'retry-post-no-key',
      prompt:
        'A service calls a partner\'s API with `POST /charges` to charge a customer. The response never arrives -- the request timed out. The retry logic, seeing a timeout, immediately retries the same POST with no idempotency key. What is the actual risk, and is retrying here safe?',
      choices: [
        {
          id: 'a',
          text: 'Safe -- POST requests are always safe to retry as long as you use exponential backoff.',
        },
        {
          id: 'b',
          text:
            "Not safe by default -- a timeout doesn't tell you whether the partner's server received and processed the original request before the response was lost; retrying blindly risks charging the customer twice. It's only safe to retry if the request carries an idempotency key the partner's API uses to recognize and dedupe the repeat.",
        },
        { id: 'c', text: 'Safe, because HTTP guarantees at-most-once delivery for POST requests.' },
        { id: 'd', text: 'Unsafe only if the response would have been a 5xx, not if it was a timeout.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A timeout is ambiguous by nature: request lost, or response lost. For a non-idempotent operation, that ambiguity is exactly the risk -- you cannot tell 'nothing happened, retry away' from 'it happened, retrying will double it' from the client side alone. An idempotency key moves the dedup decision to the server, which is the only side that actually knows what happened on the first attempt.",
    },
    {
      id: 'thundering-herd',
      prompt:
        "A service's outbound HTTP client retries failed requests with exponential backoff -- `Base * 2^attempt`, no randomization -- and no cap. A downstream API goes down for 90 seconds under load and then recovers. What's the risk with this specific backoff, once the API comes back?",
      choices: [
        {
          id: 'a',
          text: 'None -- exponential backoff without jitter is exactly as effective as full jitter at spreading out load.',
        },
        {
          id: 'b',
          text:
            "Every client that started failing at roughly the same time computed the exact same sequence of delays, so they all retry again at roughly the same instant -- a thundering herd that can look like a second traffic spike hitting the API right as it's trying to recover from the first outage.",
        },
        { id: 'c', text: 'The client will retry forever, since there is no maximum attempt count implied by backoff alone.' },
        { id: 'd', text: 'The lack of a cap means requests will eventually exceed the maximum HTTP timeout and error out.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the specific failure mode full jitter is designed to prevent: unjittered exponential backoff is deterministic given the same starting conditions, so a fleet of clients that all started failing together stays synchronized through every retry. Adding a uniformly random delay in [0, cap] desynchronizes them, spreading retries out over time instead of clustering them.",
    },
    {
      id: 'retry-after-priority',
      prompt:
        'Your client computes a backoff delay of 400ms for the next retry attempt. The response it just got back was a 429 with `Retry-After: 30`. What should the client actually wait before retrying?',
      choices: [
        { id: 'a', text: '400ms -- your own computed backoff, since it already accounts for jitter and is more precise.' },
        {
          id: 'b',
          text:
            "30 seconds -- Retry-After is the server telling you specifically when its rate limit resets or its outage is expected to clear; ignoring it and retrying on your own schedule (much sooner) just gets you rate-limited again on the very next attempt.",
        },
        { id: 'c', text: 'Whichever of the two is smaller, to minimize latency for the caller.' },
        { id: 'd', text: 'Retry-After only applies to 503 responses, not 429, so 400ms is correct here.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Retry-After (RFC 9110) is a specific, authoritative signal from the server, not a suggestion competing with your generic backoff heuristic. A 429 is exactly the case RFC 6585 defines Retry-After for. Your own backoff is a reasonable default only when the server hasn\'t told you anything more precise.',
    },
    {
      id: 'shared-rate-limiter',
      prompt:
        'A product lets multiple customer organizations use one shared integration to a partner API, and the whole integration has a single global `TokenBucket` rate limiter guarding outbound calls, shared across every organization. What breaks?',
      choices: [
        { id: 'a', text: 'Nothing -- a single global limiter is always the right choice regardless of how many tenants share it.' },
        {
          id: 'b',
          text:
            "One organization sending an unusually large burst of requests can exhaust the shared budget, starving every other organization's calls even though they individually stayed well within any reasonable per-tenant limit -- a noisy-neighbor problem.",
        },
        { id: 'c', text: 'TokenBucket implementations are not safe for concurrent use, so this would cause a data race.' },
        { id: 'd', text: 'The partner API rejects requests from services that use a global rather than per-tenant limiter.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A rate limiter enforces fairness only at the granularity it's keyed on. One bucket shared across tenants enforces a fair budget for the *service as a whole* against the partner, but does nothing to protect tenants from each other. A multi-tenant product needs a limiter keyed per organization (or per API key) so one tenant's burst can't degrade another's, in addition to whatever global ceiling the partner itself imposes.",
    },
  ],
};
