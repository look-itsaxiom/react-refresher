import type { Check } from '../../../types';

type TreeNode =
  | { kind: 'text'; value: string }
  | { kind: 'host'; tag: string; props?: Record<string, unknown>; children?: TreeNode[] }
  | { kind: 'server'; render: (props: Record<string, unknown>) => TreeNode; props?: Record<string, unknown> }
  | { kind: 'client'; id: string; props?: Record<string, unknown> };

type Payload =
  | string
  | { type: string; props: Record<string, unknown>; children: Payload[] }
  | { $$typeof: 'client-ref'; id: string; props: Record<string, unknown> };

type Mod = { renderToPayload: (node: TreeNode) => Payload };

export const checks: Check[] = [
  {
    name: 'a host node with only text children renders its tag, props, and children as-is',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      const result = renderToPayload({
        kind: 'host',
        tag: 'p',
        props: { className: 'greeting' },
        children: [{ kind: 'text', value: 'Hello' }],
      });
      expect(result).to.deep.equal({ type: 'p', props: { className: 'greeting' }, children: ['Hello'] });
    },
  },
  {
    name: 'a server component is inlined: its output appears, the component itself leaves no trace',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      const tree: TreeNode = {
        kind: 'server',
        props: { name: 'Ada' },
        render: (props) => ({ kind: 'host', tag: 'div', props: {}, children: [{ kind: 'text', value: `Hi ${props.name}` }] }),
      };
      const result = renderToPayload(tree);
      expect(result).to.deep.equal({ type: 'div', props: {}, children: ['Hi Ada'] });
      expect(JSON.stringify(result)).to.not.include('render');
    },
  },
  {
    name: 'nested server components fully inline (a server component rendering another server component)',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      const inner: TreeNode = { kind: 'server', render: () => ({ kind: 'text', value: 'deep' }) };
      const outer: TreeNode = {
        kind: 'server',
        render: () => ({ kind: 'host', tag: 'span', props: {}, children: [inner] }),
      };
      const result = renderToPayload(outer);
      expect(result).to.deep.equal({ type: 'span', props: {}, children: ['deep'] });
    },
  },
  {
    name: 'a client node becomes a client-ref placeholder carrying its id and props',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      const result = renderToPayload({ kind: 'client', id: 'LikeButton', props: { count: 3 } });
      expect(result).to.deep.equal({ $$typeof: 'client-ref', id: 'LikeButton', props: { count: 3 } });
    },
  },
  {
    name: 'a client node nested under a host node renders as a placeholder inside its children array',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      const result = renderToPayload({
        kind: 'host',
        tag: 'div',
        children: [{ kind: 'client', id: 'Widget', props: {} }],
      });
      expect(result).to.deep.equal({
        type: 'div',
        props: {},
        children: [{ $$typeof: 'client-ref', id: 'Widget', props: {} }],
      });
    },
  },
  {
    name: 'a non-serializable prop on a client node throws a descriptive error instead of returning',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      expect(() => renderToPayload({ kind: 'client', id: 'Bad', props: { onClick: () => {} } })).to.throw(/onClick/);
    },
  },
  {
    name: 'a non-serializable prop on a host node also throws, naming the tag',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { renderToPayload } = mod as unknown as Mod;
      expect(() =>
        renderToPayload({ kind: 'host', tag: 'button', props: { onClick: () => {} }, children: [] }),
      ).to.throw(/button/);
    },
  },
];
