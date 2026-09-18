import { useEffect, useState } from 'react';

type OrderItem = { id: string; name: string; price: number; qty: number };
type Order = { id: string; items: OrderItem[] };

function defaultLoadOrder(): Promise<Order> {
  return Promise.resolve({
    id: 'ord_1',
    items: [
      { id: 'sku_1', name: 'Trail mix', price: 10.1, qty: 1 },
      { id: 'sku_2', name: 'Water bottle', price: 20.2, qty: 1 },
    ],
  });
}

const PROMO_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Takes randomness as a parameter instead of reaching for Math.random() itself.
function generatePromoCode(random: () => number): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += PROMO_CHARS[Math.floor(random() * PROMO_CHARS.length)];
  }
  return code;
}

type OrderSummaryProps = {
  now?: () => number;
  random?: () => number;
  loadOrder?: () => Promise<Order>;
};

export default function OrderSummary({
  now = Date.now,
  random = Math.random,
  loadOrder = defaultLoadOrder,
}: OrderSummaryProps) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrder().then(setOrder);
  }, [loadOrder]);

  if (!order) return <p>Loading order…</p>;

  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryBy = new Date(now() + 3 * 24 * 60 * 60 * 1000);
  const promoCode = generatePromoCode(random);

  return (
    <section aria-labelledby="order-heading">
      <h2 id="order-heading">Order {order.id}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Qty</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.name}</th>
              <td>{item.qty}</td>
              <td>${(item.price * item.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Subtotal: ${total.toFixed(2)}</p>
      <p>Delivery by {deliveryBy.toLocaleDateString()}</p>
      <p>Promo code: {promoCode}</p>
    </section>
  );
}
