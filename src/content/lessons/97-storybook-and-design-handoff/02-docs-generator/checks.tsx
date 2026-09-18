import type { ComponentType, ReactNode } from 'react';
import type { Check } from '../../../types';

type ArgType = { control: 'boolean' | 'text' | 'number' | 'select'; options?: string[] };
type Meta = {
  title: string;
  component: ComponentType<any>;
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
type Mod = {
  buildDocs: (meta: Meta, stories: Record<string, StoryObj>) => DocsData;
  DocsPage: (props: { meta: Meta; docs: DocsData }) => ReactNode;
};

function Button({ label, variant }: { label: string; variant?: string }) {
  return <button data-variant={variant}>{label}</button>;
}

export const checks: Check[] = [
  {
    name: 'infers boolean, number, and text controls from meta.args value types',
    run: async ({ mod }) => {
      const { buildDocs } = mod as unknown as Mod;
      const meta: Meta = { title: 'X/Widget', component: Button, args: { on: true, count: 3, label: 'hi' } };
      const docs = buildDocs(meta, {});
      if (docs.argTypes.on?.control !== 'boolean') throw new Error(`expected 'on' inferred as boolean, got ${docs.argTypes.on?.control}`);
      if (docs.argTypes.count?.control !== 'number') throw new Error(`expected 'count' inferred as number, got ${docs.argTypes.count?.control}`);
      if (docs.argTypes.label?.control !== 'text') throw new Error(`expected 'label' inferred as text, got ${docs.argTypes.label?.control}`);
    },
  },
  {
    name: 'an explicit meta.argTypes entry (with options) wins over the inferred control',
    run: async ({ mod }) => {
      const { buildDocs } = mod as unknown as Mod;
      const meta: Meta = {
        title: 'X/Widget',
        component: Button,
        args: { variant: 'primary' }, // would infer 'text'
        argTypes: { variant: { options: ['primary', 'secondary'] } },
      };
      const docs = buildDocs(meta, {});
      if (docs.argTypes.variant?.control !== 'select') {
        throw new Error(`explicit argTypes with options should produce control 'select', got ${docs.argTypes.variant?.control}`);
      }
      if (docs.argTypes.variant?.options?.join(',') !== 'primary,secondary') {
        throw new Error('expected options to be carried through from the explicit argTypes entry');
      }
    },
  },
  {
    name: "a story's own args win over meta's when resolving final args",
    run: async ({ mod }) => {
      const { buildDocs } = mod as unknown as Mod;
      const meta: Meta = { title: 'X/Widget', component: Button, args: { label: 'Default', variant: 'primary' } };
      const stories: Record<string, StoryObj> = { Secondary: { args: { variant: 'secondary' } } };
      const docs = buildDocs(meta, stories);
      const story = docs.stories.find((s) => s.name === 'Secondary');
      if (!story) throw new Error('expected a "Secondary" story in docs.stories');
      if (story.args.label !== 'Default') throw new Error('label should fall back to the meta default');
      if (story.args.variant !== 'secondary') throw new Error("story's own variant should win over the meta's");
    },
  },
  {
    name: 'the tags: [\'primary\'] story is picked as primary even when it is not first',
    run: async ({ mod }) => {
      const { buildDocs } = mod as unknown as Mod;
      const meta: Meta = { title: 'X/Widget', component: Button, args: { label: 'Default' } };
      const stories: Record<string, StoryObj> = {
        Alpha: { args: { label: 'A' } },
        Beta: { tags: ['primary'], args: { label: 'B' } },
      };
      const docs = buildDocs(meta, stories);
      if (docs.primary?.name !== 'Beta') {
        throw new Error(`expected 'Beta' (tagged primary) to be picked, got ${docs.primary?.name}`);
      }
      if (docs.primary.args.label !== 'B') throw new Error("primary's args should be Beta's resolved args");
    },
  },
  {
    name: 'without a tagged story, the first story (in object key order) is primary',
    run: async ({ mod }) => {
      const { buildDocs } = mod as unknown as Mod;
      const meta: Meta = { title: 'X/Widget', component: Button, args: { label: 'Default' } };
      const stories: Record<string, StoryObj> = { First: { args: { label: 'F' } }, Second: { args: { label: 'S' } } };
      const docs = buildDocs(meta, stories);
      if (docs.primary?.name !== 'First') throw new Error(`expected 'First' to default to primary, got ${docs.primary?.name}`);
    },
  },
  {
    name: 'DocsPage renders a heading from the last segment of the title, a table row per argType, and passes the primary args to the rendered component',
    run: async ({ mod, render, screen, within, expect }) => {
      const { buildDocs, DocsPage } = mod as unknown as Mod;
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
      render(<DocsPage meta={meta} docs={docs} />);

      expect(screen.getByRole('heading', { name: 'Button' }), 'heading should be the last title segment').to.exist;

      const rows = document.querySelectorAll('table tr');
      expect(rows.length, 'expected one table row per argType (label, variant)').to.equal(2);

      const storiesSection = screen.getByTestId('stories');
      expect(storiesSection.textContent, 'stories section should mention the description').to.include('The default button.');

      const example = screen.getByTestId('example');
      const button = within(example).getByRole('button');
      expect(button.textContent, "the example should render meta.component with the primary story's args").to.equal('Click me');
      expect(button.getAttribute('data-variant'), 'primary story args should flow through as props').to.equal('primary');
    },
  },
];
