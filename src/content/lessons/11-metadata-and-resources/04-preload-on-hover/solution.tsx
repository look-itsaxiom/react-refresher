import { preload } from 'react-dom';

type Product = { id: number; name: string };

const PRODUCTS: Product[] = [
  { id: 1, name: 'Widget' },
  { id: 2, name: 'Gadget' },
  { id: 3, name: 'Doohickey' },
];

export default function App() {
  return (
    <main>
      <h1>Products</h1>
      <ul>
        {PRODUCTS.map((product) => (
          <li key={product.id}>
            <a
              href={`/products/${product.id}`}
              onMouseEnter={() => preload(`/images/${product.id}.jpg`, { as: 'image' })}
            >
              {product.name}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
