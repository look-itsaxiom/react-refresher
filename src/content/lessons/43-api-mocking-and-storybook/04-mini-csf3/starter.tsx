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

// TODO: for each named export other than `default`, merge meta.args under story.args, pick
// story.render ?? meta.render, and combine meta.decorators then story.decorators so the meta
// decorator ends up outermost and the story decorator innermost. Return an object of composed
// components, each with a .play(context) that calls the original story's play with the merged args.
export function composeStories<T extends StoriesModule>(
  storiesModule: T,
): { [K in keyof Omit<T, 'default'>]: ComposedStory } {
  return {} as { [K in keyof Omit<T, 'default'>]: ComposedStory };
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
