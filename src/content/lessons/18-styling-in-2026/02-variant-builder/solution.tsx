import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type Intent = 'primary' | 'secondary' | 'danger';
export type Size = 'sm' | 'md' | 'lg';

const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors';

const intentClasses: Record<Intent, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  danger: 'bg-danger text-white hover:bg-red-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'p-2 text-sm',
  md: 'p-3 text-sm',
  lg: 'p-4 text-base',
};

export type ButtonVariants = {
  intent?: Intent;
  size?: Size;
  className?: string;
};

/** The only conflict group this exercise cares about: padding shorthand. */
function groupOf(cls: string): string {
  if (/^p-\S+$/.test(cls)) return 'padding';
  return cls;
}

function mergeClasses(...lists: Array<string | undefined | false>): string {
  const tokens = lists.filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
  const winners = new Map<string, string>();
  const order: string[] = [];
  for (const token of tokens) {
    const group = groupOf(token);
    if (!winners.has(group)) order.push(group);
    winners.set(group, token);
  }
  return order.map((group) => winners.get(group)!).join(' ');
}

export function button({ intent = 'primary', size = 'md', className }: ButtonVariants = {}): string {
  const compound = intent === 'danger' && size === 'lg' ? 'ring-2 ring-red-300' : '';
  return mergeClasses(base, intentClasses[intent], sizeClasses[size], compound, className);
}

type Props = ButtonVariants & ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode };

export function Button({ intent, size, className, children, ...rest }: Props) {
  return (
    <button className={button({ intent, size, className })} {...rest}>
      {children}
    </button>
  );
}

export default function App() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <Button>Default</Button>
      <Button intent="secondary">Secondary</Button>
      <Button intent="danger" size="lg">
        Delete account
      </Button>
      <Button size="md" className="p-8">
        Custom padding
      </Button>
    </div>
  );
}
