export default function App() {
  return (
    <div className="page">
      <div className="nav">
        <div className="nav-link" onClick={() => window.location.assign('#home')}>
          Home
        </div>
        <div className="nav-link" onClick={() => window.location.assign('#pricing')}>
          Pricing
        </div>
        <div className="nav-link" onClick={() => window.location.assign('#contact')}>
          Contact
        </div>
      </div>

      <div className="content">
        <h1>Acme Analytics</h1>
        <img src="/hero.png" />
        <h4>Trusted by 4,000+ finance teams</h4>
        <p style={{ opacity: 0 }}>Internal build 4.7.2 — remove before ship</p>
        <div className="cta" onClick={() => window.alert('Signed up!')}>
          Sign up free
        </div>
        <img src="/decorative-swoosh.png" />
      </div>
    </div>
  );
}
