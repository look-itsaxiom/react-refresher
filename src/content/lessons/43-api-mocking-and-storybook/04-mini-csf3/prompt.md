Implement a miniature `composeStories`, the mechanic behind Storybook's portable stories: given a
CSF3-shaped module, turn each named story into a renderable component with its args resolved,
decorators applied, and a `play` runner attached.

```ts
type Decorator = (Story: () => React.ReactNode, context: { args: Record<string, unknown> }) => React.ReactNode;
type RenderFn = (args: Record<string, unknown>, context: { args: Record<string, unknown> }) => React.ReactNode;
type PlayFn = (context: { canvasElement: HTMLElement; args: Record<string, unknown> }) => void | Promise<void>;

type Meta = { args?: Record<string, unknown>; decorators?: Decorator[]; render?: RenderFn };
type StoryObj = { args?: Record<string, unknown>; decorators?: Decorator[]; render?: RenderFn; play?: PlayFn };
type StoriesModule = { default: Meta } & Record<string, StoryObj>;

function composeStories(storiesModule: StoriesModule): Record<string, ComposedStory>;
// where ComposedStory is a component: (props?: Record<string, unknown>) => React.ReactNode,
// with a `.play(context: { canvasElement: HTMLElement }) => Promise<void>` attached.
```

1. **Args merge, meta under story.** Each composed story's effective args are `{ ...meta.args,
   ...story.args }` — a story's own args win over the meta's, and anything the story doesn't
   specify falls back to the meta's default. Rendering the component with no props should use
   these merged args; passing props to the composed component overrides them further (`{
   ...mergedArgs, ...props }`), the same way a real portable story lets a test tweak one arg
   without redeclaring all of them.
2. **Decorator nesting: meta wraps story, not the other way around.** Combine `meta.decorators`
   and `story.decorators` (in that order) and apply them so the **meta-level decorator ends up on
   the outside** and the **story-level decorator is the innermost wrapper**, closest to the
   rendered content — this matches Storybook's real composition order (global, then component,
   then story, outermost to innermost).
3. **`render` override.** Use `story.render` if the story defines one; otherwise fall back to
   `meta.render`. A story with its own `render` should NOT also run `meta.render` — one replaces
   the other, they don't both fire.
4. **`play` runner.** The composed story's `.play(context)` should call the original story's
   `play` function (if any) with `{ canvasElement: context.canvasElement, args: <the merged args>
   }`. If the story has no `play`, `.play()` should resolve without doing anything.

A `Decorator` receives a zero-argument `Story` function — call it to render whatever it's wrapping
— and a `context` carrying the resolved `args`. `App.tsx` uses `composeStories` on a tiny two-story
fixture so the preview shows something; make it render once your implementation works.
