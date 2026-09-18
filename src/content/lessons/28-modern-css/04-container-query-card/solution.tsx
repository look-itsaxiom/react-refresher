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
        @layer reset, components;

        .card-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
          container-type: inline-size;
        }
        .card {
          display: grid;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 0.75rem;
        }
        .card:has(img) {
          grid-template-columns: 4rem 1fr;
          align-items: center;
          gap: 0.75rem;
        }
        @container (min-width: 28rem) {
          .card-grid {
            grid-template-columns: repeat(2, 1fr);
          }
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
