import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'llm-features-quiz',
  title: 'Judgment check: building LLM features',
  questions: [
    {
      id: 'q1',
      prompt:
        'Your app needs to call Claude or GPT from a "Summarize this page" button. Where should the API key live?',
      choices: [
        { id: 'a', text: 'In a client-side env var (e.g. VITE_ANTHROPIC_KEY) so the button can call the provider directly' },
        { id: 'b', text: 'On your server, behind a route the browser calls with no key of its own; the server calls the provider' },
        { id: 'c', text: 'In localStorage after the first successful request, to avoid re-sending it' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Anything shipped to the browser is readable by anyone who opens devtools or the network tab. The key must live server-side, behind an endpoint that applies auth, rate limits, and logging — the BFF pattern.',
    },
    {
      id: 'q2',
      prompt:
        'A streaming chat reply calls setState on every token. On a fast connection this causes visible jank while scrolling. What is the most direct fix?',
      choices: [
        { id: 'a', text: 'Switch from SSE to WebSockets, which do not trigger React renders' },
        { id: 'b', text: 'Buffer incoming deltas and flush to state at most once per animation frame (or ~16ms), not once per token' },
        { id: 'c', text: 'Wrap every setState call in flushSync so React processes it synchronously and predictably' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The transport (SSE vs WebSocket) is not the problem — the render frequency is. Batching deltas into a buffer and flushing on a fixed cadence caps commits regardless of how fast tokens arrive. flushSync would make it worse by forcing a synchronous render per call.',
    },
    {
      id: 'q3',
      prompt:
        "A user clicks \"Stop\" mid-response. Your stream-reading loop expects an AbortError to distinguish a deliberate stop from a real failure — but nothing is thrown, because the underlying stream just closes instead of rejecting when aborted. What should you do?",
      choices: [
        { id: 'a', text: 'Assume every non-error exit from the loop was a real failure and show an error message' },
        {
          id: 'b',
          text: "Track whether a 'done' event was received before the loop exits; if not, treat the exit as stopped, regardless of whether it happened via a thrown error or a closed stream",
        },
        { id: 'c', text: 'Poll the AbortSignal on a timer instead of reading the stream at all' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Whether an abort surfaces as a thrown error or a stream that just ends is an implementation detail of whatever's underneath. Tracking your own completion signal (a 'done' event, or your own sentinel) is robust to either behavior.",
    },
    {
      id: 'q4',
      prompt:
        'A "generate an itinerary" tool the model can call sends a real calendar invite when run. The model decides to call it based on a user message that includes text copied from a webpage. What is the OWASP LLM Top 10 concern here, and the mitigation?',
      choices: [
        { id: 'a', text: 'Insecure output handling — sanitize the itinerary text before rendering it' },
        {
          id: 'b',
          text: 'Excessive agency — require explicit user confirmation before a side-effectful tool call runs, and validate its arguments against a schema',
        },
        { id: 'c', text: 'Prompt injection — this only matters for the system prompt, not tool execution' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A tool call from the model is a request, not a command, especially once untrusted text (a scraped webpage) can influence what the model decides to do. Any side-effectful tool needs a confirmation gate and argument validation — that's the excessive-agency mitigation, independent of whether the triggering text was itself malicious.",
    },
    {
      id: 'q5',
      prompt:
        'You need to classify support tickets into 5 categories, one call per ticket, thousands of tickets a day, each response due back in under a second. Which model tier and lever matters most?',
      choices: [
        { id: 'a', text: 'The largest available model, because classification accuracy always benefits from more reasoning capacity' },
        {
          id: 'b',
          text: "A small, fast model tier, and — if the ticket text or instructions repeat across calls — prompt caching to cut latency and cost further",
        },
        { id: 'c', text: "A small model, but skip caching since each ticket's text is different anyway" },
      ],
      correctChoiceId: 'b',
      explanation:
        'Classification into a small fixed set of categories is exactly the low-latency-budget, low-complexity case a small model tier is for. Caching the stable part of the prompt (instructions, category definitions) still pays off even when the ticket body itself changes every call.',
    },
    {
      id: 'q6',
      prompt:
        "A partial JSON object streaming in mid-response fails JSON.parse because it's a truncated prefix, not because it's malformed. What's the appropriate response?",
      choices: [
        { id: 'a', text: 'Wait until the stream fully completes before parsing anything, and show a spinner until then' },
        { id: 'b', text: 'Re-prompt the model immediately, since a parse failure means the model made a mistake' },
        {
          id: 'c',
          text: 'Use a best-effort partial parser that closes open strings/brackets on the truncated prefix, to render a live preview, and validate the full object once the stream actually completes',
        },
      ],
      correctChoiceId: 'c',
      explanation:
        "A truncated prefix isn't a validation failure — it's expected mid-stream. A best-effort partial parser lets you show live progress; full schema validation still belongs at the end of the stream, not on every partial chunk.",
    },
  ],
};
