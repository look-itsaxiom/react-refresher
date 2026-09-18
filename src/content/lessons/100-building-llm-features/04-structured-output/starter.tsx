export type MiniSchema =
  | { type: 'string' }
  | { type: 'number' }
  | { type: 'boolean' }
  | { type: 'enum'; values: string[] }
  | { type: 'array'; items: MiniSchema }
  | { type: 'object'; properties: Record<string, MiniSchema>; required?: string[] };

export type ValidateResult<T> = { ok: true; value: T } | { ok: false; errors: string[]; repaired?: unknown };

export type Usage = { inputTokens: number; outputTokens: number; cachedInputTokens?: number };
export type Pricing = { inputPerMTok: number; outputPerMTok: number; cachedInputPerMTok?: number };

export type Task = {
  kind: 'classify' | 'extract' | 'draft' | 'reason' | 'agentic';
  latencyBudgetMs: number;
  qualityFloor: 'low' | 'medium' | 'high';
};
export type ModelTier = 'small' | 'medium' | 'large';

// TODO: validate `jsonText` against `schema`; on failure, try the repair pass described in the
// prompt (strip code fences, drop trailing commas, extract the first balanced {…}) before
// giving up.
export function validateStructured<T>(_schema: MiniSchema, jsonText: string): ValidateResult<T> {
  try {
    return { ok: true, value: JSON.parse(jsonText) as T };
  } catch {
    return { ok: false, errors: ['could not parse JSON'] };
  }
}

// TODO: best-effort parse of truncated JSON — close an open string, drop a dangling trailing
// comma or `"key":` with no value, then close any open brackets/braces before parsing.
export function partialJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// TODO: cached input tokens are billed at cachedInputPerMTok (or inputPerMTok if not given);
// the rest of inputTokens is billed at inputPerMTok.
export function estimateCost(_usage: Usage, _pricing: Pricing): number {
  return 0;
}

// TODO: implement the tier rules from the prompt.
export function chooseModel(_task: Task): { tier: ModelTier; reason: string } {
  return { tier: 'medium', reason: 'not implemented' };
}

// TODO: escape HTML special characters first, then support **bold**, *italic*, `code`, and
// [label](https://...) links (rel="noopener noreferrer"); anything not https:// must not
// become a link.
export function renderModelOutput(text: string): string {
  return text;
}

export default function App() {
  const html = renderModelOutput('Here is **bold**, *italic*, `code`, and a [link](https://example.com).');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
