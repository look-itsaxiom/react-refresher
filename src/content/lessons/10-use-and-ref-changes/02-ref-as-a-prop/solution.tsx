import { useImperativeHandle, useRef, type Ref } from 'react';

type TextFieldHandle = { focusAndSelect(): void };

type TextFieldProps = {
  label: string;
  defaultValue?: string;
  ref?: Ref<TextFieldHandle>;
};

function TextField({ label, defaultValue, ref }: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusAndSelect() {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  return (
    <label>
      {label}
      <input ref={inputRef} defaultValue={defaultValue} />
    </label>
  );
}

export default function App() {
  const fieldRef = useRef<TextFieldHandle>(null);

  return (
    <main>
      <TextField ref={fieldRef} label="Coupon code" defaultValue="SAVE10" />
      <button onClick={() => fieldRef.current?.focusAndSelect()}>Focus and select</button>
    </main>
  );
}
