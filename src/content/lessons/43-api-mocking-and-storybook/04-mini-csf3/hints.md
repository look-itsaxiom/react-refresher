For each story entry (`Object.entries(stories)`, having pulled `default` out first via
destructuring), compute `mergedArgs = { ...meta.args, ...story.args }` and `render = story.render ??
meta.render` once, outside the returned component — these don't change between renders of the same
composed story.

---

The composed component itself is just a function that takes optional `props`, computes `args = {
...mergedArgs, ...props }`, and needs to call `render(args, { args })` wrapped by whatever
decorators apply. Build the decorator wrapping with a loop, starting from the plain render call as
the innermost "story" and wrapping outward:

```ts
let node: () => ReactNode = () => render(args, { args });
for (let i = decorators.length - 1; i >= 0; i--) {
  const decorator = decorators[i];
  const inner = node;
  node = () => decorator(inner, { args });
}
return node();
```

---

If `decorators = [...(meta.decorators ?? []), ...(story.decorators ?? [])]`, walking that array
**backwards** (from the story's decorators to the meta's) and wrapping each one around the
previous result puts the meta decorator's call on the *outside* of the final nested structure —
work through it on paper with one decorator at each level to see why the loop direction matters.

---

`.play` on the composed component is a separate property attached to the same function, not
something the render path touches:

```ts
ComposedStory.play = async (context: { canvasElement: HTMLElement }) => {
  if (story.play) await story.play({ canvasElement: context.canvasElement, args: mergedArgs });
};
```

Attach it after creating the component function, then store the function under `composed[name]`.
Assigning a property to a function value works the same in TypeScript as any other object — you'll
need a type assertion (`as ComposedStory`) since a plain function type doesn't have `.play` yet.
