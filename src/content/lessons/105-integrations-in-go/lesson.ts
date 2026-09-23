import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-receiving-webhooks-you-can-trust.md?raw';
import promptA from './02-webhook-receiver/prompt.md?raw';
import hintsA from './02-webhook-receiver/hints.md?raw';
import starterA from '../../../../exercises-local/105-integrations-in-go/02-webhook-receiver/webhook.go?raw';
import solutionA from '../../../../exercises-local/105-integrations-in-go/02-webhook-receiver/webhook_solution.go?raw';
import concept2 from './03-calling-out-clients-that-survive-outages.md?raw';
import promptB from './04-resilient-client/prompt.md?raw';
import hintsB from './04-resilient-client/hints.md?raw';
import starterB from '../../../../exercises-local/105-integrations-in-go/04-resilient-client/resilient.go?raw';
import solutionB from '../../../../exercises-local/105-integrations-in-go/04-resilient-client/resilient_solution.go?raw';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '105-integrations-in-go',
  title: 'Integrations in Go',
  track: 'go',
  summary:
    'Webhook signatures and idempotency, retries and backoff, rate limiting, async queues, and observability of the contract.',
  steps: [
    { kind: 'concept', id: 'receiving-webhooks-you-can-trust', title: 'Receiving: webhooks you can trust', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'webhook-receiver',
      title: 'Fix the webhook receiver',
      prompt: promptA,
      runtime: 'local',
      local: {
        dir: '105-integrations-in-go/02-webhook-receiver',
        command: 'go test ./...',
        expectedTests: [
          'TestSignAndVerifyRoundTrip',
          'TestVerifyRejectsWrongSecret',
          'TestVerifyAcceptsRotatedSecret',
          'TestVerifyRejectsStaleTimestamp',
          'TestVerifyRejectsFutureTimestamp',
          'TestHandlerAcceptsValidEvent',
          'TestHandlerRejectsBadSignature',
          'TestHandlerRejectsStaleTimestamp',
          'TestHandlerAcceptsRotatedSecret',
          'TestHandlerSuppressesDuplicates',
          'TestHandlerRetriesAfterProcessingFailure',
          'TestHandlerRejectsMalformedTimestamp',
        ],
      },
      files: { 'webhook.go': starterA },
      solution: { 'webhook_solution.go': solutionA },
      hints: splitHints(hintsA),
      checks: [],
    },
    { kind: 'concept', id: 'calling-out-clients-that-survive-outages', title: "Calling out: clients that survive other people's outages", markdown: concept2 },
    {
      kind: 'exercise',
      id: 'resilient-client',
      title: 'Fix the resilient client',
      prompt: promptB,
      runtime: 'local',
      local: {
        dir: '105-integrations-in-go/04-resilient-client',
        command: 'go test ./...',
        expectedTests: [
          'TestBackoffDelayFullJitter',
          'TestBackoffDelayRespectsMax',
          'TestParseRetryAfterSeconds',
          'TestParseRetryAfterHTTPDate',
          'TestParseRetryAfterInvalid',
          'TestDoRetriesOnServiceUnavailable',
          'TestDoHonorsRetryAfterOn429',
          'TestDoDoesNotRetryPostWithoutIdempotencyKey',
          'TestDoRetriesPostWithIdempotencyKey',
          'TestDoStopsOnContextCancellation',
          'TestTokenBucketBurstAndRefill',
        ],
      },
      files: { 'resilient.go': starterB },
      solution: { 'resilient_solution.go': solutionB },
      hints: splitHints(hintsB),
      checks: [],
    },
    quiz,
  ],
};

export default lesson;
