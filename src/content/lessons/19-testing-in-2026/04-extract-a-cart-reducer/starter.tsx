import { useState } from 'react';

type CartItem = { id: string; name: string; price: number; qty: number };

const CATALOG: CartItem[] = [
  { id: 'mix', name: 'Trail mix', price: 10.1, qty: 1 },
  { id: 'bottle', name: 'Water bottle', price: 20.2, qty: 1 },
];

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponPercent, setCouponPercent] = useState(0);

  function addItem(item: CartItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + item.qty } : i));
      }
      return [...prev, item];
    });
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = [...prev];
      // Bug: when the id isn't found, findIndex returns -1, and splice(-1, 1)
      // removes the LAST item instead of doing nothing.
      next.splice(
        next.findIndex((i) => i.id === id),
        1,
      );
      return next;
    });
  }

  function applyCoupon(percent: number) {
    setCouponPercent(percent);
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  // Bug: no cap, and no rounding to cents, so floating-point drift and an
  // unbounded coupon can both leak into what the customer is charged.
  const discount = subtotal * (couponPercent / 100);
  const total = subtotal - discount;

  return (
    <div>
      <h2>Catalog</h2>
      <ul>
        {CATALOG.map((item) => (
          <li key={item.id}>
            {item.name} — ${item.price.toFixed(2)}{' '}
            <button onClick={() => addItem({ ...item, qty: 1 })}>Add {item.name}</button>
          </li>
        ))}
      </ul>
      <h2>Cart</h2>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} x{item.qty}{' '}
              <button onClick={() => removeItem(item.id)}>Remove {item.name}</button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => applyCoupon(20)}>Apply 20% off</button>
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>Discount: ${discount.toFixed(2)}</p>
      <p>Total: ${total.toFixed(2)}</p>
    </div>
  );
}
