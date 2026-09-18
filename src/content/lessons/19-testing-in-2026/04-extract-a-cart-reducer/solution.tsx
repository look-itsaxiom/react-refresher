import { useReducer } from 'react';

export type CartItem = { id: string; name: string; price: number; qty: number };
export type CartState = { items: CartItem[]; couponPercent: number };
export type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; id: string }
  | { type: 'applyCoupon'; percent: number };

export const COUPON_MAX_DISCOUNT = 5; // dollars

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, qty: i.qty + action.item.qty } : i,
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case 'remove':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'applyCoupon':
      return { ...state, couponPercent: action.percent };
    default:
      return state;
  }
}

export function selectTotals(state: CartState): { subtotal: number; discount: number; total: number } {
  const subtotalCents = state.items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.qty,
    0,
  );
  const rawDiscountCents = Math.round((subtotalCents * state.couponPercent) / 100);
  const capCents = Math.round(COUPON_MAX_DISCOUNT * 100);
  const discountCents = Math.min(rawDiscountCents, capCents, subtotalCents);
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: (subtotalCents - discountCents) / 100,
  };
}

const CATALOG: CartItem[] = [
  { id: 'mix', name: 'Trail mix', price: 10.1, qty: 1 },
  { id: 'bottle', name: 'Water bottle', price: 20.2, qty: 1 },
];

const initialState: CartState = { items: [], couponPercent: 0 };

export default function Cart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { subtotal, discount, total } = selectTotals(state);

  return (
    <div>
      <h2>Catalog</h2>
      <ul>
        {CATALOG.map((item) => (
          <li key={item.id}>
            {item.name} — ${item.price.toFixed(2)}{' '}
            <button onClick={() => dispatch({ type: 'add', item: { ...item, qty: 1 } })}>
              Add {item.name}
            </button>
          </li>
        ))}
      </ul>
      <h2>Cart</h2>
      {state.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {state.items.map((item) => (
            <li key={item.id}>
              {item.name} x{item.qty}{' '}
              <button onClick={() => dispatch({ type: 'remove', id: item.id })}>
                Remove {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => dispatch({ type: 'applyCoupon', percent: 20 })}>Apply 20% off</button>
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>Discount: ${discount.toFixed(2)}</p>
      <p>Total: ${total.toFixed(2)}</p>
    </div>
  );
}
