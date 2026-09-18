import { useEffect, useState } from 'react';

type Product = { id: number; name: string };

const PRODUCTS: Product[] = [
  { id: 1, name: 'Widget' },
  { id: 2, name: 'Gadget' },
];

export default function App() {
  const [index, setIndex] = useState(0);
  const product = PRODUCTS[index]!;

  // Bug: mutates `document` directly, no cleanup. Switching products leaves the old
  // <meta> tag in place instead of replacing it, and unmounting leaves both tags behind.
  useEffect(() => {
    document.title = `${product.name} · Store`;
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', `Buy ${product.name} now, only at Store.`);
    document.head.appendChild(meta);
  }, [product]);

  return (
    <main>
      <h1>{product.name}</h1>
      <button onClick={() => setIndex((i) => (i + 1) % PRODUCTS.length)}>
        Switch product
      </button>
    </main>
  );
}
