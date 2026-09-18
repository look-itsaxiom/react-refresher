export default function App() {
  return (
    <div className="page">
      <nav>
        <a className="nav-link" href="#home">
          Home
        </a>
        <a className="nav-link" href="#pricing">
          Pricing
        </a>
        <a className="nav-link" href="#contact">
          Contact
        </a>
      </nav>

      <main className="content">
        <h1>Acme Analytics</h1>
        <img src="/hero.png" alt="Acme Analytics dashboard showing revenue trending upward" />
        <h2>Trusted by 4,000+ finance teams</h2>
        <p hidden>Internal build 4.7.2 — remove before ship</p>
        <button className="cta" onClick={() => window.alert('Signed up!')}>
          Sign up free
        </button>
        <img src="/decorative-swoosh.png" alt="" />
      </main>
    </div>
  );
}
