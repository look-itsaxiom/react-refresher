import type { Check } from '../../../types';

type MiniSchema =
  | { type: 'string' }
  | { type: 'number' }
  | { type: 'boolean' }
  | { type: 'enum'; values: string[] }
  | { type: 'array'; items: MiniSchema }
  | { type: 'object'; properties: Record<string, MiniSchema>; required?: string[] };

type ValidateResult<T> = { ok: true; value: T } | { ok: false; errors: string[]; repaired?: unknown };
type Usage = { inputTokens: number; outputTokens: number; cachedInputTokens?: number };
type Pricing = { inputPerMTok: number; outputPerMTok: number; cachedInputPerMTok?: number };
type Task = {
  kind: 'classify' | 'extract' | 'draft' | 'reason' | 'agentic';
  latencyBudgetMs: number;
  qualityFloor: 'low' | 'medium' | 'high';
};

type Mod = {
  validateStructured: <T>(schema: MiniSchema, jsonText: string) => ValidateResult<T>;
  partialJson: (text: string) => unknown;
  estimateCost: (usage: Usage, pricing: Pricing) => number;
  chooseModel: (task: Task) => { tier: 'small' | 'medium' | 'large'; reason: string };
  renderModelOutput: (text: string) => string;
};

const personSchema: MiniSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, age: { type: 'number' }, role: { type: 'enum', values: ['admin', 'member'] } },
  required: ['name', 'role'],
};

export const checks: Check[] = [
  {
    name: 'validateStructured accepts a valid object',
    run: async ({ mod, expect }) => {
      const { validateStructured } = mod as unknown as Mod;
      const result = validateStructured(personSchema, '{"name":"Ada","age":30,"role":"admin"}');
      expect(result.ok).to.equal(true);
      expect(result.ok && result.value).to.deep.equal({ name: 'Ada', age: 30, role: 'admin' });
    },
  },
  {
    name: 'validateStructured reports a missing required field',
    run: async ({ mod, expect }) => {
      const { validateStructured } = mod as unknown as Mod;
      const result = validateStructured(personSchema, '{"age":30,"role":"admin"}');
      expect(result.ok).to.equal(false);
      expect(!result.ok && result.errors.some((e) => e.includes('name'))).to.equal(true);
    },
  },
  {
    name: 'validateStructured rejects a value with an invalid enum member',
    run: async ({ mod, expect }) => {
      const { validateStructured } = mod as unknown as Mod;
      const result = validateStructured(personSchema, '{"name":"Ada","role":"owner"}');
      expect(result.ok).to.equal(false);
      expect(!result.ok && result.errors.some((e) => e.includes('role'))).to.equal(true);
    },
  },
  {
    name: 'validateStructured rejects a wrong-typed field',
    run: async ({ mod, expect }) => {
      const { validateStructured } = mod as unknown as Mod;
      const result = validateStructured(personSchema, '{"name":"Ada","age":"thirty","role":"admin"}');
      expect(result.ok).to.equal(false);
      expect(!result.ok && result.errors.some((e) => e.includes('age'))).to.equal(true);
    },
  },
  {
    name: 'validateStructured repairs a fenced code block with a trailing comma',
    run: async ({ mod, expect }) => {
      const { validateStructured } = mod as unknown as Mod;
      const text = 'Sure, here you go:\n```json\n{"name":"Ada","role":"admin",}\n```\nHope that helps!';
      const result = validateStructured(personSchema, text);
      expect(result.ok).to.equal(true);
      expect(result.ok && result.value).to.deep.equal({ name: 'Ada', role: 'admin' });
    },
  },
  {
    name: 'partialJson closes an unterminated string and object',
    run: async ({ mod, expect }) => {
      const { partialJson } = mod as unknown as Mod;
      expect(partialJson('{"name":"Ali')).to.deep.equal({ name: 'Ali' });
    },
  },
  {
    name: 'partialJson drops a dangling trailing key with no value and closes the object',
    run: async ({ mod, expect }) => {
      const { partialJson } = mod as unknown as Mod;
      expect(partialJson('{"a":1,"b":')).to.deep.equal({ a: 1 });
    },
  },
  {
    name: 'partialJson closes a nested unfinished array inside an object',
    run: async ({ mod, expect }) => {
      const { partialJson } = mod as unknown as Mod;
      expect(partialJson('{"items":["a","b"')).to.deep.equal({ items: ['a', 'b'] });
    },
  },
  {
    name: 'estimateCost bills cached input tokens at the cached rate, not the full rate',
    run: async ({ mod, expect }) => {
      const { estimateCost } = mod as unknown as Mod;
      const pricing: Pricing = { inputPerMTok: 3, outputPerMTok: 15, cachedInputPerMTok: 0.3 };
      const withoutCache = estimateCost({ inputTokens: 1_000_000, outputTokens: 0 }, pricing);
      const withCache = estimateCost({ inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 1_000_000 }, pricing);
      expect(withoutCache).to.equal(3);
      expect(withCache).to.equal(0.3);
    },
  },
  {
    name: 'chooseModel picks small for tight-latency low-stakes classification and large for agentic tasks',
    run: async ({ mod, expect }) => {
      const { chooseModel } = mod as unknown as Mod;
      const classify = chooseModel({ kind: 'classify', latencyBudgetMs: 400, qualityFloor: 'low' });
      expect(classify.tier).to.equal('small');
      const agentic = chooseModel({ kind: 'agentic', latencyBudgetMs: 5000, qualityFloor: 'medium' });
      expect(agentic.tier).to.equal('large');
    },
  },
  {
    name: 'chooseModel always returns large for a high quality floor, regardless of task kind',
    run: async ({ mod, expect }) => {
      const { chooseModel } = mod as unknown as Mod;
      const result = chooseModel({ kind: 'draft', latencyBudgetMs: 5000, qualityFloor: 'high' });
      expect(result.tier).to.equal('large');
    },
  },
  {
    name: 'renderModelOutput converts bold, italic, code, and an https link with rel=noopener noreferrer',
    run: async ({ mod, expect }) => {
      const { renderModelOutput } = mod as unknown as Mod;
      const html = renderModelOutput('**bold** and *italic* and `code` and [go](https://example.com)');
      expect(html).to.include('<strong>bold</strong>');
      expect(html).to.include('<em>italic</em>');
      expect(html).to.include('<code>code</code>');
      expect(html).to.include('href="https://example.com"');
      expect(html).to.include('rel="noopener noreferrer"');
    },
  },
  {
    name: 'renderModelOutput never emits a javascript: link or a live <script> tag',
    run: async ({ mod, expect }) => {
      const { renderModelOutput } = mod as unknown as Mod;
      const html = renderModelOutput('[click me](javascript:alert(1)) and <script>alert(2)</script>');
      expect(html).to.not.include('<script>');
      expect(html).to.not.include('href="javascript:');
      expect(html).to.not.match(/<a\b/);
    },
  },
];
