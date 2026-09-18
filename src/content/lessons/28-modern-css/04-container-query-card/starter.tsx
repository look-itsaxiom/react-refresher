type Product = { title: string; price: string; image?: string };

const products: Product[] = [
  { title: 'Desk lamp', price: '$42', image: 'lamp.jpg' },
  { title: 'Notebook', price: '$6' },
  { title: 'Ceramic mug', price: '$14', image: 'mug.jpg' },
];

export default function App() {
  return (
    <div className="card-grid" data-testid="card-grid">
      <style>{`
        /* TODO:
           1. container-type: inline-size on .card-grid
           2. @container (min-width: ...) { .card { grid-template-columns: ...; } }
           3. .card:has(img) { ... }
           4. @layer reset, components;
        */
        .card-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        .card {
          display: grid;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 0.75rem;
        }
      `}</style>
      {products.map((p) => (
        <article className="card" data-testid="card" key={p.title}>
          {p.image && <img src={p.image} alt="" />}
          <h3>{p.title}</h3>
          <p>{p.price}</p>
        </article>
      ))}
    </div>
  );
}
