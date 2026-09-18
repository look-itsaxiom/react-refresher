import type { Check } from '../../../types';

type ComponentProps = Record<string, string | undefined> & { className?: string };
type ComponentConfig = {
  base: string;
  variants: Record<string, Record<string, string>>;
  compound?: Array<{ when: Record<string, string>; className: string }>;
  defaults?: Record<string, string>;
};

export const checks: Check[] = [
  {
    name: 'createComponent(): with no props, defaults are resolved and their classes applied',
    run: async ({ mod, expect }) => {
      const createComponent = mod.createComponent as (config: ComponentConfig) => (props?: ComponentProps) => string;
      const button = createComponent({
        base: 'rounded-md',
        variants: { intent: { primary: 'bg-accent', secondary: 'bg-surface-2' }, size: { sm: 'p-2', md: 'p-3' } },
        defaults: { intent: 'primary', size: 'md' },
      });
      const classes = button().split(/\s+/);
      expect(classes).to.include('rounded-md');
      expect(classes).to.include('bg-accent');
      expect(classes).to.include('p-3');
    },
  },
  {
    name: 'createComponent(): an explicit prop overrides the default without leaving the default class behind',
    run: async ({ mod, expect }) => {
      const createComponent = mod.createComponent as (config: ComponentConfig) => (props?: ComponentProps) => string;
      const button = createComponent({
        base: 'rounded-md',
        variants: { intent: { primary: 'bg-accent', secondary: 'bg-surface-2' } },
        defaults: { intent: 'primary' },
      });
      const classes = button({ intent: 'secondary' }).split(/\s+/);
      expect(classes).to.include('bg-surface-2');
      expect(classes).to.not.include('bg-accent');
    },
  },
  {
    name: 'createComponent(): an unknown variant value is silently ignored, not thrown or stringified into the output',
    run: async ({ mod, expect }) => {
      const createComponent = mod.createComponent as (config: ComponentConfig) => (props?: ComponentProps) => string;
      const button = createComponent({
        base: 'rounded-md',
        variants: { size: { sm: 'p-2', md: 'p-3', lg: 'p-4' } },
        defaults: { size: 'md' },
      });
      const result = button({ size: 'xl' });
      expect(result.split(/\s+/)).to.deep.equal(['rounded-md']);
      expect(result).to.not.include('undefined');
    },
  },
  {
    name: 'createComponent(): a compound rule fires only when every "when" condition matches the resolved variants, including defaults',
    run: async ({ mod, expect }) => {
      const createComponent = mod.createComponent as (config: ComponentConfig) => (props?: ComponentProps) => string;
      const button = createComponent({
        base: 'rounded-md',
        variants: {
          intent: { primary: 'bg-accent', danger: 'bg-danger' },
          size: { md: 'p-3', lg: 'p-4' },
        },
        compound: [{ when: { intent: 'danger', size: 'lg' }, className: 'ring-2' }],
        defaults: { intent: 'primary', size: 'lg' },
      });
      expect(button({ intent: 'danger', size: 'lg' }).split(/\s+/)).to.include('ring-2');
      expect(button({ intent: 'danger', size: 'md' }).split(/\s+/)).to.not.include('ring-2');
      expect(button({ intent: 'primary', size: 'lg' }).split(/\s+/)).to.not.include('ring-2');
      // The compound rule must match against the resolved (default) size, not only an
      // explicit `size` prop: size defaults to "lg" here, so intent="danger" alone triggers it.
      expect(button({ intent: 'danger' }).split(/\s+/)).to.include('ring-2');
    },
  },
  {
    name: 'dedupeUtilities(): keeps only the last class in a conflict group and leaves unrelated classes untouched',
    run: async ({ mod, expect }) => {
      const dedupeUtilities = mod.dedupeUtilities as (className: string, conflicts: Record<string, string[]>) => string;
      const result = dedupeUtilities('rounded-md p-2 text-sm p-8', { padding: ['p-2', 'p-3', 'p-4', 'p-8'] });
      const classes = result.split(/\s+/);
      expect(classes).to.include('p-8');
      expect(classes).to.not.include('p-2');
      expect(classes).to.include('rounded-md');
      expect(classes).to.include('text-sm');
    },
  },
  {
    name: 'the rendered <Button> applies a className where the caller-supplied padding utility replaced the size default',
    run: async ({ render, screen, expect, act, mod }) => {
      const Button = mod.Button as (props: Record<string, unknown>) => React.ReactElement;
      await act(async () => {
        render(<Button size="lg" className="p-8" intent="danger">Go</Button>);
      });
      const el = screen.getByRole('button');
      const classes = el.className.split(/\s+/);
      expect(classes).to.include('p-8');
      expect(classes).to.not.include('p-4');
      expect(classes).to.include('bg-danger');
      // intent="danger" + size="lg" is this lesson's compound trigger, so its extra
      // emphasis class must still be present alongside the deduped padding class.
      expect(classes).to.include('ring-2');
    },
  },
];
