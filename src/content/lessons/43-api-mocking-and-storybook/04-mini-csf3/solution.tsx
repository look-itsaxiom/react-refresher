import type { ReactNode } from 'react';

export type StoryContext = { args: Record<string, unknown> };
export type Decorator = (Story: () => ReactNode, context: StoryContext) => ReactNode;
export type RenderFn = (args: Record<string, unknown>, context: StoryContext) => ReactNode;
export type PlayFn = (context: { canvasElement: HTMLElement; args: Record<string, unknown> }) => void | Promise<void>;

export type Meta = {
  args?: Record<string, unknown>;
  decorators?: Decorator[];
  render?: RenderFn;
};

export type StoryObj = {
  args?: Record<string, unknown>;
  decorators?: Decorator[];
  render?: RenderFn;
  play?: PlayFn;
};

export type StoriesModule = { default: Meta } & Record<string, StoryObj>;

export type ComposedStory = ((props?: Record<string, unknown>) => ReactNode) & {
  play: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

export function composeStories<T extends StoriesModule>(
  storiesModule: T,
): { [K in keyof Omit<T, 'default'>]: ComposedStory } {
  const { default: meta, ...stories } = storiesModule;
  const composed = {} as { [K in keyof Omit<T, 'default'>]: ComposedStory };

  for (const [name, story] of Object.entries(stories)) {
    const mergedArgs = { ...meta.args, ...story.args };
    const render = story.render ?? meta.render;
    if (!render) {
      throw new Error(`Story "${name}" has no render function (set one on the story or its meta)`);
    }
    const decorators = [...(meta.decorators ?? []), ...(story.decorators ?? [])];

    const ComposedStory = ((props?: Record<string, unknown>) => {
      const args = { ...mergedArgs, ...props };
      let node: () => ReactNode = () => render(args, { args });
      // Wrap from the innermost decorator (last in the combined list, i.e. the story's own)
      // outward to the outermost (first, i.e. the meta's), so meta ends up wrapping story.
      for (let i = decorators.length - 1; i >= 0; i--) {
        const decorator = decorators[i];
        if (!decorator) continue;
        const inner = node;
        node = () => decorator(inner, { args });
      }
      return node();
    }) as ComposedStory;

    ComposedStory.play = async (context: { canvasElement: HTMLElement }) => {
      if (story.play) await story.play({ canvasElement: context.canvasElement, args: mergedArgs });
    };

    (composed as Record<string, ComposedStory>)[name] = ComposedStory;
  }

  return composed;
}

const meta: Meta = {
  args: { label: 'Default' },
  render: (args) => <button>{String(args.label)}</button>,
};

const Primary: StoryObj = { args: { label: 'Primary' } };
const Secondary: StoryObj = {
  args: { label: 'Secondary' },
  decorators: [(Story) => <div style={{ border: '1px dashed gray', padding: 8 }}>{Story()}</div>],
};

const { Primary: ComposedPrimary, Secondary: ComposedSecondary } = composeStories({
  default: meta,
  Primary,
  Secondary,
});

export default function App() {
  return (
    <div style={{ padding: 16, display: 'flex', gap: 12 }}>
      <ComposedPrimary />
      <ComposedSecondary />
    </div>
  );
}
