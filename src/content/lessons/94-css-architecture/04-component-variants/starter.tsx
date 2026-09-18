import type { ButtonHTMLAttributes } from 'react';

export type VariantMap = Record<string, Record<string, string>>;
export type CompoundRule = { when: Record<string, string>; className: string };
export type ComponentConfig = {
  base: string;
  variants: VariantMap;
  compound?: CompoundRule[];
  defaults?: Record<string, string>;
};
export type ComponentProps = Record<string, string | undefined> & { className?: string };

export function createComponent(config: ComponentConfig): (props?: ComponentProps) => string {
  // TODO: compose base + variants (in definition order) + compound rules + className.
  return () => config.base;
}

export function dedupeUtilities(className: string, _conflicts: Record<string, string[]>): string {
  // TODO: for each conflict group, keep only the last class from that group.
  return className;
}

const buttonClasses = createComponent({
  base: 'rounded-md font-medium transition-colors',
  variants: {
    intent: {
      primary: 'bg-accent text-white',
      secondary: 'bg-surface-2 text-ink',
      danger: 'bg-danger text-white',
    },
    size: {
      sm: 'p-2 text-sm',
      md: 'p-3 text-base',
      lg: 'p-4 text-lg',
    },
  },
  compound: [{ when: { intent: 'danger', size: 'lg' }, className: 'ring-2 ring-red-300' }],
  defaults: { intent: 'primary', size: 'md' },
});

const PADDING_CONFLICTS: Record<string, string[]> = {
  padding: ['p-2', 'p-3', 'p-4', 'p-8'],
};

type ButtonProps = {
  intent?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export function Button({ intent, size, className, ...rest }: ButtonProps) {
  const composed = buttonClasses({ intent, size, className });
  const deduped = dedupeUtilities(composed, PADDING_CONFLICTS);
  return <button className={deduped} {...rest} />;
}

export default function App() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button>Default</Button>
      <Button intent="secondary" size="sm">Secondary small</Button>
      <Button intent="danger" size="lg">Danger large</Button>
      <Button size="lg" className="p-8">Custom padding</Button>
    </div>
  );
}
