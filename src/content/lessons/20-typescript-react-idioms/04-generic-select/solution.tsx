import { useState } from 'react';

type Plan = { id: string; label: string; seats: number };

const plans = [
  { id: 'starter', label: 'Starter', seats: 1 },
  { id: 'team', label: 'Team', seats: 5 },
  { id: 'enterprise', label: 'Enterprise', seats: 50 },
] satisfies Plan[];

type SelectProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onChange: (item: T) => void;
  placeholder?: string;
};

function Select<T,>({ items, getKey, getLabel, onChange, placeholder }: SelectProps<T>) {
  return (
    <select
      id="plan"
      defaultValue=""
      onChange={(event) => {
        const item = items.find((candidate) => getKey(candidate) === event.target.value);
        if (item) onChange(item);
      }}
    >
      <option value="" disabled>
        {placeholder ?? 'Choose a plan'}
      </option>
      {items.map((item) => (
        <option key={getKey(item)} value={getKey(item)}>
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}

export default function App() {
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <main>
      <label htmlFor="plan">Plan</label>
      <Select
        items={plans}
        getKey={(p) => p.id}
        getLabel={(p) => p.label}
        onChange={setSelected}
        placeholder="Choose a plan"
      />
      {selected && (
        <p>
          {selected.label} — {selected.seats} seat{selected.seats === 1 ? '' : 's'}
        </p>
      )}
    </main>
  );
}
