# Validate structured output, budget a call, and sanitize what you render

Five small functions, each independent. No React rendering is graded here beyond the default
preview — focus on the logic.

## `validateStructured`

```ts
type MiniSchema =
  | { type: 'string' }
  | { type: 'number' }
  | { type: 'boolean' }
  | { type: 'enum'; values: string[] }
  | { type: 'array'; items: MiniSchema }
  | { type: 'object'; properties: Record<string, MiniSchema>; required?: string[] };

function validateStructured<T>(
  schema: MiniSchema,
  jsonText: string,
): { ok: true; value: T } | { ok: false; errors: string[]; repaired?: unknown };
```

Parse `jsonText` and check it against `schema` (type match, required object keys present, enum
membership, recursing into `array`/`object`). If direct parsing or validation fails, attempt a
repair pass before giving up: strip a surrounding ```` ```json ... ``` ```` (or plain ` ``` `)
code fence, remove trailing commas before `}` or `]`, and extract the first balanced `{…}`
substring from surrounding prose. If the repaired text parses and validates, return
`{ ok: true, value }`; if it parses but still fails, return `{ ok: false, errors, repaired }`
including the parsed-but-invalid value.

## `partialJson`

```ts
function partialJson(text: string): unknown;
```

Best-effort parse of a truncated JSON string — the kind you'd have mid-stream, before the
model has finished. Close any string left open, drop a trailing dangling `,` or a trailing
`"key":` with no value yet, then close any open `{`/`[` in the right order, and `JSON.parse`
the result. Return `undefined` if that still doesn't parse.

## `estimateCost`

```ts
function estimateCost(
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number },
  pricing: { inputPerMTok: number; outputPerMTok: number; cachedInputPerMTok?: number },
): number;
```

Dollar cost for one call. Cached input tokens are billed at `cachedInputPerMTok` (falling back
to `inputPerMTok` if not given) instead of the normal input rate; the rest of `inputTokens` is
billed normally.

## `chooseModel`

```ts
function chooseModel(task: {
  kind: 'classify' | 'extract' | 'draft' | 'reason' | 'agentic';
  latencyBudgetMs: number;
  qualityFloor: 'low' | 'medium' | 'high';
}): { tier: 'small' | 'medium' | 'large'; reason: string };
```

Never a model ID — a tier, plus a one-sentence reason. Rules to implement: a `high` quality
floor, or a `reason`/`agentic` task, always needs `'large'`. Otherwise, a tight latency budget
(`<= 300`ms) forces `'small'`. Otherwise, `'extract'`/`'draft'` land on `'medium'`; a `'classify'`
task with a `low` quality floor and a latency budget under 500ms can use `'small'`; anything else
defaults to `'medium'`.

## `renderModelOutput`

```ts
function renderModelOutput(text: string): string;
```

Turn model-generated text into safe HTML for `dangerouslySetInnerHTML`. Support **bold**
(`**text**`), *italic* (`*text*`), `` `inline code` ``, and `[label](https://...)` links —
`https:` only, with `rel="noopener noreferrer"` added. Everything else in the input must come
through neutralized: HTML special characters escaped before any of the above substitutions run,
so a raw `<script>` tag or a `javascript:` URL in a link never becomes live markup.
