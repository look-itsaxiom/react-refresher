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

// TODO: infer argTypes from meta.args (boolean -> 'boolean', string -> 'text', number ->
// 'number'), let an explicit meta.argTypes[key] entry replace the inferred one wholesale, treat
// an explicit entry with `options` as a 'select'. Resolve each story's args as
// { ...meta.args, ...story.args }. Pick the tags: ['primary'] story, or the first story if none
// is tagged.
export function buildDocs(meta: Meta, stories: Record<string, StoryObj>): DocsData {
  return { name: meta.title, argTypes: {}, stories: [], primary: undefined };
}

// TODO: render an <h1> with docs.name, a <table> with one row per argTypes entry (name, control,
// default from meta.args), a data-testid="stories" section listing each story's name,
// description, and resolved args, and a data-testid="example" section rendering
// meta.component with the primary story's args.
export function DocsPage({ meta, docs }: { meta: Meta; docs: DocsData }): ReactNode {
  return null;
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
