import { useEffect, useState } from 'react';

type OrderItem = { id: string; name: string; price: number; qty: number };
type Order = { id: string; items: OrderItem[] };

// A module-level loader: tests have no way to intercept this call.
function loadOrderFromServer(): Promise<Order> {
  return Promise.resolve({
    id: 'ord_1',
    items: [
      { id: 'sku_1', name: 'Trail mix', price: 10.1, qty: 1 },
      { id: 'sku_2', name: 'Water bottle', price: 20.2, qty: 1 },
    ],
  });
}

const PROMO_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Reaches directly for Math.random(): impossible to predict in a test.
function generatePromoCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += PROMO_CHARS[Math.floor(Math.random() * PROMO_CHARS.length)];
  }
  return code;
}

export default function OrderSummary() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrderFromServer().then(setOrder);
  }, []);

  if (!order) return <div data-testid="loading">Loading order…</div>;

  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  // Reaches directly for Date.now(): a different answer every day.
  const deliveryBy = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return (
    <div data-testid="order-summary">
      <div data-testid="order-title">Order {order.id}</div>
      {order.items.map((item) => (
        <div data-testid="order-row" key={item.id}>
          <div data-testid="item-name">{item.name}</div>
          <div data-testid="item-qty">{item.qty}</div>
          <div data-testid="item-price">${(item.price * item.qty).toFixed(2)}</div>
        </div>
      ))}
      <div data-testid="order-total">Subtotal: ${total.toFixed(2)}</div>
      <div data-testid="delivery-date">Delivery by {deliveryBy.toLocaleDateString()}</div>
      <div data-testid="promo-code">Promo code: {generatePromoCode()}</div>
    </div>
  );
}
