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

// TODO: when two classes belong to the same utility "group", the later one should
// replace the earlier one instead of both surviving. For now, just handle padding
// shorthand: any `p-<value>` class conflicts with every other `p-<value>` class.
// Everything else never conflicts with anything.
function mergeClasses(...lists: Array<string | undefined | false>): string {
  return lists.filter(Boolean).join(' ');
}

export function button({ intent = 'primary', size = 'md', className }: ButtonVariants = {}): string {
  // TODO: compound variant — when intent is 'danger' AND size is 'lg', the result
  // should also include 'ring-2 ring-red-300'.
  return mergeClasses(base, intentClasses[intent], sizeClasses[size], className);
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
