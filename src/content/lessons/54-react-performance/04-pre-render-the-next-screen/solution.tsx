import { Activity, useState } from 'react';

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
      {/* FIX: both steps are created up front. Activity's `mode` controls which one is
          visible; the hidden one still gets created (and pays its setup cost) right away
          — its state, once initialized, survives being hidden, so revisiting it later
          never re-runs the lazy initializer. */}
      <Activity mode={step === 1 ? 'visible' : 'hidden'}>
        <Step1 onNext={() => setStep(2)} />
      </Activity>
      <Activity mode={step === 2 ? 'visible' : 'hidden'}>
        <Step2 />
      </Activity>
    </div>
  );
}
