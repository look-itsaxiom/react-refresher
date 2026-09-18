import { useState } from 'react';

type Faq = { question: string; answer: string };

const FAQS: Faq[] = [
  {
    question: 'What is a headless component?',
    answer:
      'A component that provides behavior, state, and ARIA wiring but ships no markup or styles of its own — you render the DOM.',
  },
  {
    question: 'Why not build ARIA myself?',
    answer:
      'You can, for simple widgets. For comboboxes, trees, and grids, the state machine and screen reader quirks are large enough that most teams buy it instead.',
  },
  {
    question: 'What does aria-activedescendant do?',
    answer:
      'It lets a container keep real DOM focus while pointing at a logically "active" descendant by id, without moving focus onto that descendant.',
  },
];

function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  return (
    <div className="faq-item">
      <div className="faq-header" onClick={onToggle}>
        {faq.question}
      </div>
      {open && <div className="faq-answer">{faq.answer}</div>}
    </div>
  );
}

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main>
      <h2>Frequently asked questions</h2>
      {FAQS.map((faq, index) => (
        <FaqItem
          key={faq.question}
          faq={faq}
          open={openIndex === index}
          onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
        />
      ))}
    </main>
  );
}
