import { useRef, useState } from 'react';

type Item = { id: string; label: string; price: number };

const MUG: Item = { id: 'mug', label: 'Mug', price: 8 };
const HAT: Item = { id: 'hat', label: 'Hat', price: 15 };

function CartTotal({ items }: { items: Item[] }) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Fixed: derive the total during render. No state, no effect, no extra commit.
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <p>
      Total: <output data-testid="total">${total}</output>
      <span data-testid="cart-renders" hidden>
        {renderCount.current}
      </span>
    </p>
  );
}

function NoteEditor({ customerId }: { customerId: string }) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Fixed: no reset effect needed. The parent remounts this component with a
  // fresh `key` whenever `customerId` changes, so `note` starts at '' again.
  const [note, setNote] = useState('');

  return (
    <>
      <input
        data-testid="note"
        data-customer={customerId}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Gift note"
      />
      <span data-testid="note-renders" hidden>
        {renderCount.current}
      </span>
    </>
  );
}

export default function App() {
  const [customerId, setCustomerId] = useState('alice');
  const [items, setItems] = useState<Item[]>([MUG]);

  return (
    <div>
      <p data-testid="customer">{customerId}</p>
      <NoteEditor key={customerId} customerId={customerId} />
      <button onClick={() => setCustomerId((id) => (id === 'alice' ? 'bob' : 'alice'))}>Switch customer</button>
      <CartTotal items={items} />
      <button onClick={() => setItems((current) => [...current, HAT])}>Add hat</button>
    </div>
  );
}
