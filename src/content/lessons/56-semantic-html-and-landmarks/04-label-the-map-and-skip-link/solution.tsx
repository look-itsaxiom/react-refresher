import { useRef } from 'react';

export default function App() {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="page">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>

      <nav aria-label="Primary">
        <a href="#home">Home</a>
        <a href="#pricing">Pricing</a>
        <a href="#contact">Contact</a>
      </nav>

      <h1>Acme Analytics</h1>

      <section className="related" aria-labelledby="related-heading">
        <h2 id="related-heading">Related guides</h2>
        <ul className="related-list" style={{ listStyle: 'none' }} role="list">
          <li>Getting started</li>
          <li>Billing FAQ</li>
        </ul>
      </section>

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <h2>Dashboard</h2>
        <p>Welcome back.</p>
      </main>

      <nav aria-label="Footer">
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
      </nav>
    </div>
  );
}
