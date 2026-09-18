import type { Check } from '../../../types';

type AnyEl = HTMLElement & {
  name?: string;
  count?: number;
  render: () => string;
  updated: (changed: Map<string, unknown>) => void;
  updateComplete: Promise<void>;
};

type Mod = { define: (suffix: string) => string };

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function spyOn<T extends AnyEl, K extends 'render' | 'updated'>(
  el: T,
  method: K,
): { calls: unknown[][] } {
  const original = (el[method] as (...args: unknown[]) => unknown).bind(el);
  const record = { calls: [] as unknown[][] };
  (el as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
    record.calls.push(args);
    return original(...args);
  };
  return record;
}

export const checks: Check[] = [
  {
    name: 'batches two synchronous property writes into exactly one render, and skips a no-op write',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { define } = mod as unknown as Mod;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as AnyEl;
      const renders = spyOn(el, 'render');
      document.body.appendChild(el);
      await el.updateComplete;
      const afterInitial = renders.calls.length;
      expect(afterInitial, 'exactly one render after connecting').to.equal(1);

      el.name = 'Ada';
      el.count = 1;
      await el.updateComplete;
      expect(renders.calls.length, 'one render for two synchronous property writes').to.equal(afterInitial + 1);

      el.count = 1; // unchanged value
      await ctx.sleep(20);
      expect(renders.calls.length, 'setting the same value again renders nothing').to.equal(afterInitial + 1);
    },
  },
  {
    name: 'updateComplete resolves only after the batched render actually ran',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { define } = mod as unknown as Mod;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as AnyEl;
      const renders = spyOn(el, 'render');
      document.body.appendChild(el);
      el.count = 42;
      // Right after the synchronous set, the render must not have happened yet — it's batched.
      expect(renders.calls.length, 'no render yet, synchronously after a property write').to.equal(0);
      await el.updateComplete;
      expect(renders.calls.length, 'a render happened once updateComplete resolved').to.be.greaterThan(0);
      expect(el.shadowRoot!.textContent, 'the rendered DOM reflects the new value').to.contain('42');
    },
  },
  {
    name: 'a reflect:true property writes its attribute; a non-reflected one does not',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { define } = mod as unknown as Mod;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as AnyEl;
      document.body.appendChild(el);
      await el.updateComplete;

      el.name = 'Grace';
      el.count = 9;
      await el.updateComplete;
      expect(el.getAttribute('name'), 'reflect: true mirrors the property to its attribute').to.equal('Grace');
      expect(el.hasAttribute('count'), 'a property without reflect: true stays off the attribute').to.equal(false);
    },
  },
  {
    name: 'setting an attribute converts it back to the right type without looping',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { define } = mod as unknown as Mod;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as AnyEl;
      document.body.appendChild(el);
      await el.updateComplete;

      el.setAttribute('count', '7');
      await el.updateComplete;
      expect(el.count, 'a Number-typed attribute converts to a real number').to.equal(7);
      expect(el.shadowRoot!.textContent).to.contain('7');
    },
  },
  {
    name: 'updated(changed) receives a Map of only the properties that changed, with their old value',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { define } = mod as unknown as Mod;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as AnyEl;
      document.body.appendChild(el);
      await el.updateComplete;

      el.name = 'Ada';
      await el.updateComplete;

      const updates = spyOn(el, 'updated');
      el.name = 'Grace';
      await el.updateComplete;

      expect(updates.calls.length, 'updated was called once for this batch').to.equal(1);
      const changed = (updates.calls[0] ?? [])[0] as Map<string, unknown>;
      expect(changed.get('name'), 'the changed map holds the previous value of the property that changed').to.equal('Ada');
      expect(changed.has('count'), 'a property that did not change in this batch is not in the map').to.equal(false);
    },
  },
];
