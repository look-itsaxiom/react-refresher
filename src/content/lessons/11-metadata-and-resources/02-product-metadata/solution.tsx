import { useState } from 'react';

type Product = { id: number; name: string };

const PRODUCTS: Product[] = [
  { id: 1, name: 'Widget' },
  { id: 2, name: 'Gadget' },
];

export default function App() {
  const [index, setIndex] = useState(0);
  const product = PRODUCTS[index]!;

  return (
    <main>
      <title>{`${product.name} · Store`}</title>
      <meta name="description" content={`Buy ${product.name} now, only at Store.`} />
      <h1>{product.name}</h1>
      <button onClick={() => setIndex((i) => (i + 1) % PRODUCTS.length)}>
        Switch product
      </button>
    </main>
  );
}
