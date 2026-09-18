import { useRef } from 'react';

const FAQS = [
  { question: 'Do you offer refunds?', answer: 'Full refund within 30 days, no questions asked.' },
  { question: 'How do I cancel?', answer: 'Cancel any time from your account settings page.' },
  { question: 'Is there a free trial?', answer: 'Yes, every plan includes a 14 day free trial.' },
];

export default function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div>
      {FAQS.map((faq) => (
        <details key={faq.question} name="faq">
          <summary>{faq.question}</summary>
          {faq.answer}
        </details>
      ))}

      <button onClick={() => { if (dialogRef.current) dialogRef.current.open = true; }}>
        Delete account
      </button>

      <dialog ref={dialogRef}>
        <p>Are you sure?</p>
        <button onClick={() => { if (dialogRef.current) dialogRef.current.open = false; }}>
          Cancel
        </button>
      </dialog>
    </div>
  );
}
