import { useEffect, useRef, useState } from 'react';

type Item = { id: string; label: string; price: number };

const MUG: Item = { id: 'mug', label: 'Mug', price: 8 };
const HAT: Item = { id: 'hat', label: 'Hat', price: 15 };

function CartTotal({ items }: { items: Item[] }) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Bug: mirrors a value that could be computed directly into state via an effect.
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((sum, item) => sum + item.price, 0));
  }, [items]);

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

  const [note, setNote] = useState('');

  // Bug: resets a draft via an effect instead of remounting with `key`.
  useEffect(() => {
    setNote('');
  }, [customerId]);

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
      <NoteEditor customerId={customerId} />
      <button onClick={() => setCustomerId((id) => (id === 'alice' ? 'bob' : 'alice'))}>Switch customer</button>
      <CartTotal items={items} />
      <button onClick={() => setItems((current) => [...current, HAT])}>Add hat</button>
    </div>
  );
}
