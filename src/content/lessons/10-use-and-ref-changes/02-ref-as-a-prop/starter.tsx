import { forwardRef, useRef } from 'react';

type TextFieldProps = {
  label: string;
  defaultValue?: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, defaultValue },
  ref,
) {
  return (
    <label>
      {label}
      <input ref={ref} defaultValue={defaultValue} />
    </label>
  );
});

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <main>
      <TextField ref={inputRef} label="Coupon code" defaultValue="SAVE10" />
      <button onClick={() => inputRef.current?.focus()}>Focus and select</button>
    </main>
  );
}
