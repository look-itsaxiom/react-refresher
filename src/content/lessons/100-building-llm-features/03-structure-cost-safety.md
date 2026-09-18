# Structure, cost, and safety

Free-text is fine for a chat bubble. The moment you want the model to fill a form, pick a
category, or return data your code will branch on, you need structured output — and once
you're calling a model per request, you need to think about what each call costs, how long a
user waits, and what happens when the model (or an attacker hiding text inside its context)
produces something dangerous.

## Structured outputs

Both major APIs support constraining a response to a schema: OpenAI's Responses API has
"structured outputs" with strict JSON-schema mode; Anthropic's equivalent pattern is a
forced tool call whose input schema *is* your data shape, so "the model returns structured
data" and "the model uses a tool" are the same mechanism under the hood. Either way, you still
validate on receipt — treat the schema as a strong hint the provider enforces server-side, not
a guarantee your client-side types are safe from a malformed response, a version mismatch, or a
provider bug. Validate with a real schema library in production (Zod or another Standard
Schema implementation, lesson 17); this lesson has you write a minimal validator by hand so you
can see what "validate" actually checks: type, required keys, enum membership, nesting.

**Repair, don't just reject.** Models wrap JSON in code fences, add a trailing comma, or pad it
with a sentence of preamble more often than you'd like. A repair pass — strip fences, drop
trailing commas, extract the first balanced `{…}` from surrounding prose — recovers a
large fraction of "almost valid" responses before you give up and re-prompt.

**Partial objects while streaming.** If you're streaming a structured response (say, a form
you're filling field-by-field as the model generates it), the JSON is invalid for most of the
stream — it's a prefix of the final object. A "best-effort" parser that closes unterminated
strings and brackets on a truncated prefix lets you show a live, partially-filled preview
without waiting for the closing brace.

## Cost, latency, and model choice

Pricing is quoted per million tokens, input and output priced separately, output usually
several times the input rate. Prompt caching — sending a stable prefix (a system prompt, a
big document) and paying a reduced rate for cache hits on later requests — is the single
biggest lever for cost and latency on repeated context; treat cache-eligible content as
whatever *doesn't change* between requests. On Anthropic's Claude models, the shape is a
write premium and a read discount: writing to the cache costs more than a normal input
token (roughly 1.25x for a 5-minute cache, 2x for a 1-hour cache), while a cache hit costs
a fraction of the normal input rate. (Exact multipliers and dollar prices move between
provider announcements — check the provider's current pricing page before you budget
against a number here.)

Pick model size per task, not per app: a `Haiku`-class small model for classification or
extraction where the task is narrow and the failure mode is cheap to catch; a mid-size model
for drafting and most extraction that needs judgment; the largest, slowest tier for multi-step
reasoning or an agent making its own tool-call decisions, where a wrong step compounds. The
Claude model family as of 2026 is publicly `claude-opus-5`, `claude-sonnet-5`, and
`claude-haiku-4-5` — but a course exercise should never hardcode a model ID, because these
change; return a *tier* and let a config map the tier to whatever ID is current.

Time-to-first-token (TTFT) and total throughput are different numbers — a model can start fast
and finish slow, or vice versa. Show progress (the streaming text itself is the progress
indicator) instead of a spinner once tokens start arriving, and set a hard timeout for TTFT so a
stalled request fails visibly instead of hanging the UI. Track a per-user or per-session token
budget for anything that isn't a fixed-price product feature; an unbounded loop (an agent that
keeps calling itself) can spend real money fast. Log prompts and responses for debugging and
evals, but treat that log like any other PII store — redact or hash user content you don't need
verbatim, and don't retain more than your privacy policy promises.

## Safety: treat model output as untrusted input

This is the OWASP LLM Top 10's throughline, and the part of "building LLM features" that's
actually a security topic, not a UX one.

- **Prompt injection.** Text the model reads — a user's message, a fetched web page, a
  document you retrieved — can contain instructions aimed at the model, not at your user
  ("ignore previous instructions and…"). You can't fully prevent this by prompting; you
  prevent the *damage* by limiting what the model's output is allowed to do.
- **Insecure output handling.** Never feed model output into `dangerouslySetInnerHTML` without
  sanitizing it first (lesson 63) — an injected `<script>` or `<img onerror=…>` in the
  response is exactly as dangerous as one from any other untrusted source. Never `eval` model
  output, and never auto-run a shell command or code block the model produced.
- **Excessive agency.** A tool call is a request, not a command. Allowlist which tools exist,
  validate their arguments against a schema before running them, and require explicit user
  confirmation for anything with a side effect (send, delete, purchase, modify). Scope what a
  tool *can* touch as narrowly as the feature allows.
- **Sensitive information disclosure.** Don't put secrets, other users' data, or more of your
  system prompt than necessary somewhere a crafted prompt could get the model to repeat it
  back. Rate-limit and monitor for abuse (scraping your system prompt, using your endpoint as a
  free proxy to the underlying model).

## Evals and testing

You can't unit-test "is this a good response" the way you test a pure function, but you can get
close: build a small golden set of representative inputs with known-acceptable outputs or
properties (contains X, doesn't contain Y, valid against schema Z), and run it whenever the
prompt or model changes. "LLM-as-judge" — asking a model to grade another model's output — is
useful for catching regressions at scale but is itself unreliable for anything the judge model
hasn't seen calibrated examples of; use it as a first pass, not a merge gate on its own. For the
frontend layer specifically, none of this requires a real model: record a real transcript once,
replay it as a fake stream fixture, and your component tests are deterministic — which is
exactly what this lesson's exercises do.

## Further reading

- OWASP Top 10 for LLM Applications — https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Anthropic, prompt caching — https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- OpenAI, structured outputs — https://platform.openai.com/docs/guides/structured-outputs
- Lesson 63 (sanitization), lesson 17 (schema validation), lesson 22 (server functions)
