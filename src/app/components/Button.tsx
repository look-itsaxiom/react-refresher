import type { ComponentProps } from 'react';

type Props = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'md' };

const base = 'inline-flex items-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent';
const variants = {
  primary: 'bg-accent text-black hover:bg-accent-strong',
  ghost: 'bg-transparent text-ink hover:bg-surface-3 border border-border',
  danger: 'bg-transparent text-danger hover:bg-danger/10 border border-danger/40',
};
const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm' };

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />;
}
