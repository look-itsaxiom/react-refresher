import { useState } from 'react';

type Plan = { id: string; label: string; seats: number };

const plans = [
  { id: 'starter', label: 'Starter', seats: 1 },
  { id: 'team', label: 'Team', seats: 5 },
  { id: 'enterprise', label: 'Enterprise', seats: 50 },
] satisfies Plan[];

// TODO: make this generic over the item type T instead of hard-coding Plan, and
// implement the <select>'s onChange so it looks up the matching item and calls the
// onChange prop with that whole item, not the raw string value the DOM event gives you.
type SelectProps = {
  items: Plan[];
  getKey: (item: Plan) => string;
  getLabel: (item: Plan) => string;
  onChange: (item: Plan) => void;
  placeholder?: string;
};

function Select({ items, getKey, getLabel, placeholder }: SelectProps) {
  return (
    <select id="plan" defaultValue="">
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
