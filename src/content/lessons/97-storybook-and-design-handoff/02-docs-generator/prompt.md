Build a miniature version of what Storybook's autodocs does: given a CSF3-shaped `meta` and a set
of named stories, infer a controls table, resolve each story's final args, and render a docs page
from it.

```ts
type ArgType = { control: 'boolean' | 'text' | 'number' | 'select'; options?: string[] };

type Meta = {
  title: string; // e.g. "Design System/Forms/Button"
  component: React.ComponentType<any>;
  args?: Record<string, unknown>;
  argTypes?: Record<string, Partial<ArgType>>;
};

type StoryObj = {
  args?: Record<string, unknown>;
  tags?: string[];
  parameters?: { docs?: { description?: string } };
};

type DocsData = {
  name: string;
  argTypes: Record<string, ArgType>;
  stories: Array<{ name: string; description?: string; args: Record<string, unknown> }>;
  primary: { name: string; args: Record<string, unknown> } | undefined;
};

function buildDocs(meta: Meta, stories: Record<string, StoryObj>): DocsData;
function DocsPage(props: { meta: Meta; docs: DocsData }): React.ReactNode;
```

1. **`name`**: the last `/`-separated segment of `meta.title` (`"Design System/Forms/Button"` →
   `"Button"`).
2. **Infer `argTypes` from `meta.args`.** For every key in `meta.args`, infer a control from its
   JavaScript type: `boolean` → `'boolean'`, `string` → `'text'`, `number` → `'number'`. If
   `meta.argTypes` already has an entry (fully or partially specified) for that key, the explicit
   entry wins outright — do not merge individual fields, the explicit `ArgType` replaces the
   inferred one for that key. An explicit `argTypes` entry with `options` (regardless of the
   inferred type) means `control: 'select'` with those `options`. Keys that appear only in
   `meta.argTypes` (not in `meta.args`) still get a row — use the explicit entry as-is, defaulting
   `control` to `'text'` if somehow unset.
3. **Resolve each story's final args**: `{ ...meta.args, ...story.args }`, same precedence as
   `composeStories` from lesson 43.
4. **Pick the primary story**: the story tagged `tags: ['primary']`, or if none is tagged, the
   first entry in `stories` (in the object's own key order). Only one story should ever be primary.
5. **`docs.stories`**: one entry per story, `name` the object key, `description` from
   `story.parameters?.docs?.description` (omit the field if there isn't one), `args` the resolved
   args from step 3.
6. **`DocsPage`** renders, using `docs`:
   - an `<h1>` with `docs.name`.
   - a `<table>` with one `<tr>` per `argTypes` entry, in the same key order as `docs.argTypes`,
     each row's cells (in order) holding the arg name, its `control`, and its default value from
     `meta.args` (stringified; empty string if the arg has no default).
   - a stories section (`data-testid="stories"`) with one child per story showing its name, its
     description if present, and its resolved args (`JSON.stringify`) somewhere in a `<code>`
     element.
   - an example section (`data-testid="example"`) rendering `meta.component` with the primary
     story's resolved args, if there is a primary story.

`App.tsx` wires a small `Button` fixture component through `buildDocs` and `DocsPage` so the
preview renders something once your implementation works.
