function FieldGroup({ label, hint, defaultValue }: { label: string; hint: string; defaultValue?: string }) {
  return (
    <div className="field-group">
      <label htmlFor="name">{label}</label>
      <input id="name" name="name" defaultValue={defaultValue} aria-describedby="name-hint" />
      <p id="name-hint">{hint}</p>
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
