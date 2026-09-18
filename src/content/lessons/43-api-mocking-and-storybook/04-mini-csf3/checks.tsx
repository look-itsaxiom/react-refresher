import type { ReactNode } from 'react';
import type { Check } from '../../../types';

type StoryContext = { args: Record<string, unknown> };
type Decorator = (Story: () => ReactNode, context: StoryContext) => ReactNode;
type RenderFn = (args: Record<string, unknown>, context: StoryContext) => ReactNode;
type PlayFn = (context: { canvasElement: HTMLElement; args: Record<string, unknown> }) => void | Promise<void>;
type Meta = { args?: Record<string, unknown>; decorators?: Decorator[]; render?: RenderFn };
type StoryObj = { args?: Record<string, unknown>; decorators?: Decorator[]; render?: RenderFn; play?: PlayFn };
type StoriesModule = { default: Meta } & Record<string, StoryObj>;
type ComposedStory = ((props?: Record<string, unknown>) => ReactNode) & {
  play: (context: { canvasElement: HTMLElement }) => Promise<void>;
};
type Mod = {
  composeStories: <T extends StoriesModule>(storiesModule: T) => { [K in keyof Omit<T, 'default'>]: ComposedStory };
};

export const checks: Check[] = [
  {
    name: "a story's own args win over the meta's, and unset args fall back to the meta's defaults",
    run: async ({ mod, render, screen, expect }) => {
      const { composeStories } = mod as unknown as Mod;
      const meta: Meta = {
        args: { label: 'Default', variant: 'meta-default' },
        render: (args) => (
          <button>
            {String(args.label)} / {String(args.variant)}
          </button>
        ),
      };
      const Primary: StoryObj = { args: { label: 'Primary' } };

      const { Primary: ComposedPrimary } = composeStories({ default: meta, Primary });
      render(<ComposedPrimary />);
      expect(
        screen.getByRole('button').textContent,
        "label should come from the story's own args, variant should fall back to the meta's",
      ).to.equal('Primary / meta-default');
    },
  },
  {
    name: 'decorators compose with the meta-level decorator outermost and the story-level decorator innermost',
    run: async ({ mod, render, expect }) => {
      const { composeStories } = mod as unknown as Mod;
      const meta: Meta = {
        args: { label: 'X' },
        decorators: [(Story) => <div data-testid="meta-wrap">{Story()}</div>],
        render: (args) => <span>{String(args.label)}</span>,
      };
      const Wrapped: StoryObj = {
        decorators: [(Story) => <div data-testid="story-wrap">{Story()}</div>],
      };

      const { Wrapped: ComposedWrapped } = composeStories({ default: meta, Wrapped });
      const { container } = render(<ComposedWrapped />);

      const metaWrap = container.querySelector('[data-testid="meta-wrap"]');
      expect(metaWrap, 'the meta decorator should render at all').to.exist;
      const storyWrapInsideMeta = metaWrap!.querySelector('[data-testid="story-wrap"]');
      expect(
        storyWrapInsideMeta,
        'the story decorator should be nested INSIDE the meta decorator (meta wraps story, not the reverse)',
      ).to.exist;
    },
  },
  {
    name: "a story's own render replaces the meta's render entirely, instead of both running",
    run: async ({ mod, render, screen, expect }) => {
      const { composeStories } = mod as unknown as Mod;
      const meta: Meta = {
        args: { label: 'X' },
        render: (args) => <button>{String(args.label)}</button>,
      };
      const Custom: StoryObj = {
        args: { label: 'Custom' },
        render: (args) => <span data-testid="custom-render">{String(args.label)}</span>,
      };

      const { Custom: ComposedCustom } = composeStories({ default: meta, Custom });
      render(<ComposedCustom />);
      expect(screen.getByTestId('custom-render').textContent).to.equal('Custom');
      expect(screen.queryByRole('button'), "the meta's render should not also run").to.be.null;
    },
  },
  {
    name: "play() runs the story's interaction against the real rendered DOM",
    run: async ({ mod, render, expect }) => {
      const { composeStories } = mod as unknown as Mod;
      let clicked = false;
      const meta: Meta = { args: { label: 'Go' } };
      const Interactive: StoryObj = {
        args: {
          onClick: () => {
            clicked = true;
          },
        },
        render: (args) => (
          <button onClick={args.onClick as () => void}>{String(args.label)}</button>
        ),
        play: async ({ canvasElement }) => {
          const button = canvasElement.querySelector('button');
          button?.click();
        },
      };

      const { Interactive: ComposedInteractive } = composeStories({ default: meta, Interactive });
      const { container } = render(<ComposedInteractive />);
      expect(clicked, 'should not have run yet before play() is called').to.be.false;

      await ComposedInteractive.play({ canvasElement: container });
      expect(clicked, "play() should click the button and trigger the arg-bound handler").to.be.true;
    },
  },
];
