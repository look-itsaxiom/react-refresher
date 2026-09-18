Start with `argTypes`. Loop over `Object.keys(meta.args ?? {})`, infer a control from
`typeof meta.args[key]`, then loop over `Object.keys(meta.argTypes ?? {})` afterward and overwrite
each key wholesale with the explicit entry (filling `control: 'select'` when it has `options` and
no `control`, else defaulting to `'text'` if it's missing `control` entirely).

---

Resolve a story's args once and reuse the value: `const args = { ...meta.args, ...story.args }`.
Do this inside your loop over `Object.entries(stories)` so you build `docs.stories` and can also
check each story's `tags` for `'primary'` in the same pass.

---

Track the primary story name as you iterate: keep a `let primaryName = firstStoryName` (the first
key you see) and overwrite it whenever you hit a story whose `tags` includes `'primary'`. At the
end, look up that name's resolved args in the `docs.stories` array (or keep a side map while
building it) to construct `docs.primary`.

---

For `DocsPage`, build the table rows straight from `Object.entries(docs.argTypes)` — the default
column reads `meta.args?.[name]`, stringified with `String(...)`, falling back to `''` when the
key isn't in `meta.args` at all. For the example section,
`docs.primary && <meta.component {...docs.primary.args} />` — the JSX spread does the work of
"pass the primary story's args to the component."

---

Full shape as a sanity check:

```tsx
export function buildDocs(meta: Meta, stories: Record<string, StoryObj>): DocsData {
  const argTypes: Record<string, ArgType> = {};
  for (const [key, value] of Object.entries(meta.args ?? {})) {
    const control = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text';
    argTypes[key] = { control };
  }
  for (const [key, explicit] of Object.entries(meta.argTypes ?? {})) {
    argTypes[key] = {
      control: explicit.control ?? (explicit.options ? 'select' : 'text'),
      ...(explicit.options ? { options: explicit.options } : {}),
    };
  }

  const storyEntries = Object.entries(stories);
  let primaryName = storyEntries[0]?.[0];
  const docsStories = storyEntries.map(([name, story]) => {
    if (story.tags?.includes('primary')) primaryName = name;
    const args = { ...meta.args, ...story.args };
    const description = story.parameters?.docs?.description;
    return { name, args, ...(description ? { description } : {}) };
  });

  const primaryStory = docsStories.find((s) => s.name === primaryName);
  const name = meta.title.split('/').pop() ?? meta.title;

  return {
    name,
    argTypes,
    stories: docsStories,
    primary: primaryStory ? { name: primaryStory.name, args: primaryStory.args } : undefined,
  };
}
```
