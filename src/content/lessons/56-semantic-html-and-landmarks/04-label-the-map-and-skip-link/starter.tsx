export default function App() {
  return (
    <div className="page">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <nav>
        <a href="#home">Home</a>
        <a href="#pricing">Pricing</a>
        <a href="#contact">Contact</a>
      </nav>

      <h1>Acme Analytics</h1>

      <section className="related">
        <h3>Related guides</h3>
        <ul className="related-list" style={{ listStyle: 'none' }}>
          <li>Getting started</li>
          <li>Billing FAQ</li>
        </ul>
      </section>

      <main id="main-content">
        <h2>Dashboard</h2>
        <p>Welcome back.</p>
      </main>

      <nav>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
      </nav>
    </div>
  );
}
