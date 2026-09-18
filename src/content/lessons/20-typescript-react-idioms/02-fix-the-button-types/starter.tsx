import { useState, type ReactNode } from 'react';

type ButtonProps = {
  variant?: 'primary' | 'secondary';
  href?: string;
  onClick?: () => void;
  'aria-label'?: string;
  children?: ReactNode;
};

// TODO: this bag of optional props lets you pass href and onClick at the same time,
// always renders a <button> even when href is set, and drops aria-label (and every
// other native attribute) on the floor instead of passing it through. Replace
// ButtonProps with a discriminated union: one branch extends
// ComponentPropsWithoutRef<'a'> for links, the other extends
// ComponentPropsWithoutRef<'button'>, and spread the rest of the props onto
// whichever element you render.
function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  return (
    <button type="button" className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
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
