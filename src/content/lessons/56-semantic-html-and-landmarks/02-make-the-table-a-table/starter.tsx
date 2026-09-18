type Plan = { name: string; seats: number; price: number };

const plans: Plan[] = [
  { name: 'Team', seats: 20, price: 99 },
  { name: 'Starter', seats: 5, price: 29 },
  { name: 'Enterprise', seats: 200, price: 899 },
  { name: 'Business', seats: 50, price: 249 },
];

export default function App() {
  return (
    <div className="pricing-grid">
      <div className="grid-row grid-header">
        <div className="cell">Plan</div>
        <div className="cell">Seats</div>
        <div className="cell" onClick={() => window.alert('sort by price')}>
          Price
        </div>
      </div>
      {plans.map((plan) => (
        <div className="grid-row" key={plan.name}>
          <div className="cell">{plan.name}</div>
          <div className="cell">{plan.seats}</div>
          <div className="cell">${plan.price}/mo</div>
        </div>
      ))}
    </div>
  );
}
