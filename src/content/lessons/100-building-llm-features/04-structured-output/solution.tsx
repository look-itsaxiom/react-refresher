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

function validateAgainst(schema: MiniSchema, value: unknown, path: string): string[] {
  switch (schema.type) {
    case 'string':
      return typeof value === 'string' ? [] : [`${path}: expected string`];
    case 'number':
      return typeof value === 'number' ? [] : [`${path}: expected number`];
    case 'boolean':
      return typeof value === 'boolean' ? [] : [`${path}: expected boolean`];
    case 'enum':
      return typeof value === 'string' && schema.values.includes(value)
        ? []
        : [`${path}: expected one of ${schema.values.join(', ')}`];
    case 'array': {
      if (!Array.isArray(value)) return [`${path}: expected array`];
      return value.flatMap((item, i) => validateAgainst(schema.items, item, `${path}[${i}]`));
    }
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${path}: expected object`];
      const obj = value as Record<string, unknown>;
      const errors: string[] = [];
      for (const key of schema.required ?? []) {
        if (!(key in obj)) errors.push(`${path}.${key}: required`);
      }
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) errors.push(...validateAgainst(propSchema, obj[key], `${path}.${key}`));
      }
      return errors;
    }
    default:
      return [`${path}: unknown schema type`];
  }
}

function tryParse(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function stripFence(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? (match[1] ?? text) : text;
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1');
}

function extractBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function repair(text: string): string {
  let out = stripFence(text).trim();
  out = stripTrailingCommas(out);
  return extractBalancedObject(out) ?? out;
}

export function validateStructured<T>(schema: MiniSchema, jsonText: string): ValidateResult<T> {
  const direct = tryParse(jsonText);
  if (direct.ok) {
    const errors = validateAgainst(schema, direct.value, '$');
    if (errors.length === 0) return { ok: true, value: direct.value as T };
  }

  const repaired = tryParse(repair(jsonText));
  if (repaired.ok) {
    const errors = validateAgainst(schema, repaired.value, '$');
    if (errors.length === 0) return { ok: true, value: repaired.value as T };
    return { ok: false, errors, repaired: repaired.value };
  }

  if (direct.ok) return { ok: false, errors: validateAgainst(schema, direct.value, '$') };
  return { ok: false, errors: ['could not parse JSON'] };
}

export function partialJson(text: string): unknown {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of text) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}') {
      if (stack[stack.length - 1] === '{') stack.pop();
    } else if (ch === ']') {
      if (stack[stack.length - 1] === '[') stack.pop();
    }
  }

  let out = text;
  if (inString) out += '"';
  out = out.replace(/,\s*$/, '');
  out = out.replace(/"(?:[^"\\]|\\.)*"\s*:\s*$/, '');
  out = out.replace(/,\s*$/, '');

  for (let i = stack.length - 1; i >= 0; i -= 1) out += stack[i] === '{' ? '}' : ']';

  try {
    return JSON.parse(out);
  } catch {
    return undefined;
  }
}

export function estimateCost(usage: Usage, pricing: Pricing): number {
  const cached = usage.cachedInputTokens ?? 0;
  const freshInput = Math.max(0, usage.inputTokens - cached);
  const cachedRate = pricing.cachedInputPerMTok ?? pricing.inputPerMTok;
  const cost =
    (freshInput / 1_000_000) * pricing.inputPerMTok +
    (cached / 1_000_000) * cachedRate +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMTok;
  return Math.round(cost * 1e6) / 1e6;
}

export function chooseModel(task: Task): { tier: ModelTier; reason: string } {
  if (task.qualityFloor === 'high' || task.kind === 'reason' || task.kind === 'agentic') {
    return { tier: 'large', reason: 'a high quality floor or a reasoning/agentic task needs the strongest model' };
  }
  if (task.latencyBudgetMs <= 300) {
    return { tier: 'small', reason: 'the latency budget is too tight for a larger model' };
  }
  if (task.kind === 'extract' || task.kind === 'draft') {
    return { tier: 'medium', reason: `${task.kind} tasks usually need more than a small model but not the largest` };
  }
  if (task.kind === 'classify' && task.qualityFloor === 'low' && task.latencyBudgetMs < 500) {
    return { tier: 'small', reason: 'simple low-stakes classification under a modest latency budget fits a small model' };
  }
  return { tier: 'medium', reason: 'default to a mid-size model absent a reason to go bigger or smaller' };
}

export function renderModelOutput(text: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let out = escape(text);

  out = out.replace(
    /\[([^[\]]+)\]\((https:\/\/[^\s)]+)\)/g,
    (_m, label: string, url: string) => `<a href="${url}" rel="noopener noreferrer">${label}</a>`,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  return out;
}

export default function App() {
  const html = renderModelOutput('Here is **bold**, *italic*, `code`, and a [link](https://example.com).');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
