import { useState } from 'react';

type Plan = { name: string; seats: number; price: number };

const plans: Plan[] = [
  { name: 'Team', seats: 20, price: 99 },
  { name: 'Starter', seats: 5, price: 29 },
  { name: 'Enterprise', seats: 200, price: 899 },
  { name: 'Business', seats: 50, price: 249 },
];

export default function App() {
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending');

  const sorted = [...plans].sort((a, b) =>
    direction === 'ascending' ? a.price - b.price : b.price - a.price,
  );

  return (
    <table>
      <caption>Pricing plans</caption>
      <thead>
        <tr>
          <th scope="col">Plan</th>
          <th scope="col">Seats</th>
          <th scope="col" aria-sort={direction}>
            <button
              onClick={() =>
                setDirection((current) => (current === 'ascending' ? 'descending' : 'ascending'))
              }
            >
              Price {direction === 'ascending' ? '▲' : '▼'}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((plan) => (
          <tr key={plan.name}>
            <th scope="row">{plan.name}</th>
            <td>{plan.seats}</td>
            <td>${plan.price}/mo</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
