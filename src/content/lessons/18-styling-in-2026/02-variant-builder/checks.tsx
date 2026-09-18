import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'button() with no args returns base classes plus the default intent and size',
    run: async ({ mod, expect }) => {
      const classes = (mod.button as (v?: unknown) => string)().split(/\s+/);
      expect(classes).to.include('rounded-md');
      expect(classes).to.include('bg-accent'); // default intent: primary
      expect(classes).to.include('p-3'); // default size: md
    },
  },
  {
    name: 'button({ intent }) swaps intent classes without leaving the old ones behind',
    run: async ({ mod, expect }) => {
      const classes = (mod.button as (v?: unknown) => string)({ intent: 'secondary' }).split(/\s+/);
      expect(classes).to.include('bg-surface-2');
      expect(classes).to.not.include('bg-accent');
    },
  },
  {
    name: 'compound variant: danger + lg adds the extra ring classes, other combos do not',
    run: async ({ mod, expect }) => {
      const button = mod.button as (v?: unknown) => string;
      const dangerLg = button({ intent: 'danger', size: 'lg' }).split(/\s+/);
      expect(dangerLg).to.include('ring-2');
      expect(dangerLg).to.include('ring-red-300');

      const dangerMd = button({ intent: 'danger', size: 'md' }).split(/\s+/);
      expect(dangerMd).to.not.include('ring-2');

      const primaryLg = button({ intent: 'primary', size: 'lg' }).split(/\s+/);
      expect(primaryLg).to.not.include('ring-2');
    },
  },
  {
    name: 'a later padding class from className replaces the size default instead of sitting alongside it',
    run: async ({ mod, expect }) => {
      const classes = (mod.button as (v?: unknown) => string)({ size: 'md', className: 'p-8' }).split(/\s+/);
      expect(classes).to.include('p-8');
      expect(classes).to.not.include('p-3');
      // non-conflicting classes should be untouched
      expect(classes).to.include('rounded-md');
    },
  },
  {
    name: 'the rendered <Button> applies the merged class string to the actual <button> element',
    run: async ({ render, screen, expect, act, mod }) => {
      const Button = mod.Button as (props: Record<string, unknown>) => React.ReactElement;
      await act(async () => {
        render(<Button size="sm" className="p-8" intent="danger" />);
      });
      const el = screen.getByRole('button');
      const classes = el.className.split(/\s+/);
      expect(classes).to.include('p-8');
      expect(classes).to.not.include('p-2');
      expect(classes).to.include('bg-danger');
    },
  },
];
