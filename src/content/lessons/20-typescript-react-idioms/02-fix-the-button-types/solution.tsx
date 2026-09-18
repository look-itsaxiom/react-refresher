import { useState, type ComponentPropsWithoutRef } from 'react';

type ButtonVariant = 'primary' | 'secondary';

type LinkButtonProps = ComponentPropsWithoutRef<'a'> & {
  variant?: ButtonVariant;
  href: string;
};

type PlainButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
};

type ButtonProps = LinkButtonProps | PlainButtonProps;

function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');

  if ('href' in props) {
    const { href, ...rest } = props;
    return <a className={classes} href={href} {...rest} />;
  }

  return <button type="button" className={classes} {...props} />;
}

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <Button variant="primary" onClick={() => setCount((c) => c + 1)} aria-label="Increment counter">
        Clicked {count} times
      </Button>
      <Button variant="secondary" href="/somewhere" aria-label="Go somewhere link">
        Go somewhere
      </Button>
    </main>
  );
}
