import type { ComponentType, ReactNode } from 'react';

export type ArgType = { control: 'boolean' | 'text' | 'number' | 'select'; options?: string[] };

export type Meta = {
  title: string;
  component: ComponentType<any>;
  args?: Record<string, unknown>;
  argTypes?: Record<string, Partial<ArgType>>;
};

export type StoryObj = {
  args?: Record<string, unknown>;
  tags?: string[];
  parameters?: { docs?: { description?: string } };
};

export type DocsData = {
  name: string;
  argTypes: Record<string, ArgType>;
  stories: Array<{ name: string; description?: string; args: Record<string, unknown> }>;
  primary: { name: string; args: Record<string, unknown> } | undefined;
};

export function buildDocs(meta: Meta, stories: Record<string, StoryObj>): DocsData {
  const argTypes: Record<string, ArgType> = {};

  for (const [key, value] of Object.entries(meta.args ?? {})) {
    const control: ArgType['control'] =
      typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text';
    argTypes[key] = { control };
  }

  for (const [key, explicit] of Object.entries(meta.argTypes ?? {})) {
    const control: ArgType['control'] = explicit.control ?? (explicit.options ? 'select' : 'text');
    argTypes[key] = explicit.options ? { control, options: explicit.options } : { control };
  }

  const storyEntries = Object.entries(stories);
  let primaryName = storyEntries[0]?.[0];

  const docsStories = storyEntries.map(([name, story]) => {
    if (story.tags?.includes('primary')) primaryName = name;
    const args = { ...meta.args, ...story.args };
    const description = story.parameters?.docs?.description;
    return description ? { name, description, args } : { name, args };
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

export function DocsPage({ meta, docs }: { meta: Meta; docs: DocsData }): ReactNode {
  const Component = meta.component;
  return (
    <div>
      <h1>{docs.name}</h1>
      <table>
        <tbody>
          {Object.entries(docs.argTypes).map(([name, argType]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{argType.control}</td>
              <td>{meta.args && name in meta.args ? String(meta.args[name]) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div data-testid="stories">
        {docs.stories.map((story) => (
          <div key={story.name}>
            <h3>{story.name}</h3>
            {story.description ? <p>{story.description}</p> : null}
            <code>{JSON.stringify(story.args)}</code>
          </div>
        ))}
      </div>
      <div data-testid="example">
        {docs.primary ? <Component {...docs.primary.args} /> : null}
      </div>
    </div>
  );
}

function Button({ label, variant }: { label: string; variant?: string }) {
  return <button data-variant={variant}>{label}</button>;
}

const meta: Meta = {
  title: 'Design System/Forms/Button',
  component: Button,
  args: { label: 'Click me', variant: 'primary' },
  argTypes: { variant: { options: ['primary', 'secondary'] } },
};

const stories: Record<string, StoryObj> = {
  Primary: { tags: ['primary'], parameters: { docs: { description: 'The default button.' } } },
  Secondary: { args: { variant: 'secondary' } },
};

const docs = buildDocs(meta, stories);

export default function App() {
  return <DocsPage meta={meta} docs={docs} />;
}
