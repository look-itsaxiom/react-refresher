// ---- Given: a tiny in-memory "component tree" model. ----
// This is NOT real JSX or React elements — it's a plain-object stand-in for
// what a framework's render tree looks like right before it becomes an RSC
// ("Flight") payload. See prompt.md for what each node kind means.

export type TreeNode =
  | { kind: 'text'; value: string }
  | { kind: 'host'; tag: string; props?: Record<string, unknown>; children?: TreeNode[] }
  | { kind: 'server'; render: (props: Record<string, unknown>) => TreeNode; props?: Record<string, unknown> }
  | { kind: 'client'; id: string; props?: Record<string, unknown> };

export type Payload =
  | string
  | { type: string; props: Record<string, unknown>; children: Payload[] }
  | { $$typeof: 'client-ref'; id: string; props: Record<string, unknown> };

/** Given: a simplified serializability check (same idea as the previous exercise). Do not change. */
export function isSerializable(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') return true;
  if (t !== 'object') return false; // functions, symbols
  if (Array.isArray(value)) return value.every(isSerializable);
  if (value instanceof Date || value instanceof Map || value instanceof Set) return true;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value as Record<string, unknown>).every(isSerializable);
}

function assertSerializableProps(props: Record<string, unknown>, describe: (name: string) => string): void {
  for (const [name, value] of Object.entries(props)) {
    if (!isSerializable(value)) {
      throw new Error(describe(name));
    }
  }
}

/**
 * Model of turning a component tree into an RSC ("Flight") payload.
 * See prompt.md for the exact behavior to implement.
 */
export function renderToPayload(node: TreeNode): Payload {
  switch (node.kind) {
    case 'text':
      return node.value;

    case 'server': {
      // Inline it: the server component itself leaves no trace, only what it rendered does.
      const rendered = node.render(node.props ?? {});
      return renderToPayload(rendered);
    }

    case 'client': {
      const props = node.props ?? {};
      assertSerializableProps(props, (name) => `Cannot serialize prop "${name}" for client reference "${node.id}"`);
      return { $$typeof: 'client-ref', id: node.id, props };
    }

    case 'host': {
      const props = node.props ?? {};
      assertSerializableProps(props, (name) => `Cannot serialize prop "${name}" on host tag "${node.tag}"`);
      return {
        type: node.tag,
        props,
        children: (node.children ?? []).map(renderToPayload),
      };
    }

    default: {
      const _exhaustive: never = node;
      throw new Error(`Unknown node kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

const demoTree: TreeNode = {
  kind: 'server',
  props: { name: 'Ada' },
  render: (props) => ({
    kind: 'host',
    tag: 'div',
    props: { className: 'card' },
    children: [
      { kind: 'text', value: `Hello, ${props.name as string}` },
      { kind: 'client', id: 'LikeButton', props: { count: 3 } },
    ],
  }),
};

export default function App() {
  let output: string;
  try {
    output = JSON.stringify(renderToPayload(demoTree), null, 2);
  } catch (err) {
    output = `Error: ${(err as Error).message}`;
  }
  return <pre data-testid="payload">{output}</pre>;
}
