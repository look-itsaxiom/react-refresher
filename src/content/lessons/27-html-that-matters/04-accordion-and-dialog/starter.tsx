import { useState } from 'react';

const FAQS = [
  { question: 'Do you offer refunds?', answer: 'Full refund within 30 days, no questions asked.' },
  { question: 'How do I cancel?', answer: 'Cancel any time from your account settings page.' },
  { question: 'Is there a free trial?', answer: 'Yes, every plan includes a 14 day free trial.' },
];

export default function App() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div>
      {/* Bug: a hand-rolled accordion. Replace with <details name="faq">. */}
      {FAQS.map((faq, index) => (
        <div key={faq.question} className="faq-item">
          <div className="faq-question" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
            {faq.question}
          </div>
          {openIndex === index && <div className="faq-answer">{faq.answer}</div>}
        </div>
      ))}

      <button onClick={() => setConfirmOpen(true)}>Delete account</button>

      {/* Bug: a hand-rolled modal overlay. Replace with <dialog>. */}
      {confirmOpen && (
        <div className="overlay">
          <div className="modal">
            <p>Are you sure?</p>
            <button onClick={() => setConfirmOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
