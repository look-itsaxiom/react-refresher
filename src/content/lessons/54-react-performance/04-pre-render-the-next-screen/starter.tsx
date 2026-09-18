import { useState } from 'react';

// Module-scoped counter: fresh per check (each check re-evaluates this module), so it
// tracks how many times the expensive setup has actually run in this render of the app.
let setupRuns = 0;

function runExpensiveSetup(): number {
  setupRuns += 1;
  return setupRuns;
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div data-testid="step1">
      <h2>Step 1</h2>
      <p>Take your time. Nothing else is happening on this screen.</p>
      <button onClick={onNext}>Next</button>
    </div>
  );
}

function Step2() {
  // Expensive one-time setup — parsing a large dataset, warming a chart library. A lazy
  // useState initializer runs exactly once, the moment this component instance is first
  // created, not on every render.
  const [initCount] = useState(() => runExpensiveSetup());

  return (
    <div data-testid="step2" data-init-count={initCount}>
      <h2>Step 2</h2>
      <p>Ready.</p>
    </div>
  );
}

export default function Wizard() {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div data-testid="wizard">
      {/* BUG: Step2 (and its expensive setup) doesn't exist at all until the user reaches
          it, so they always pay that cost right when they're waiting to see the result. */}
      {step === 1 ? <Step1 onNext={() => setStep(2)} /> : null}
      {step === 2 ? <Step2 /> : null}
    </div>
  );
}
