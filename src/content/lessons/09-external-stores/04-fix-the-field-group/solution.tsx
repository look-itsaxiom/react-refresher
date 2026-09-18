import { useId } from 'react';

function FieldGroup({ label, hint, defaultValue }: { label: string; hint: string; defaultValue?: string }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input id={id} name="name" defaultValue={defaultValue} aria-describedby={hintId} />
      <p id={hintId}>{hint}</p>
    </div>
  );
}

export default function App() {
  return (
    <form>
      <FieldGroup label="First name" hint="As it appears on your ID." defaultValue="Ada" />
      <FieldGroup label="Last name" hint="As it appears on your ID." defaultValue="Lovelace" />
    </form>
  );
}
