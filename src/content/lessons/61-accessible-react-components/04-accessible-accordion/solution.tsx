import { useId, useRef, useState } from 'react';

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

function FaqItem({
  faq,
  open,
  onToggle,
  buttonRef,
  onHeaderKeyDown,
}: {
  faq: Faq;
  open: boolean;
  onToggle: () => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onHeaderKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const buttonId = useId();
  const panelId = useId();

  return (
    <div className="faq-item">
      <h3>
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          onKeyDown={onHeaderKeyDown}
        >
          {faq.question}
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        {faq.answer}
      </div>
    </div>
  );
}

export default function FaqAccordion({ singleOpen = false }: { singleOpen?: boolean }) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set());
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function toggle(index: number) {
    setOpenIndexes((current) => {
      const isOpen = current.has(index);
      if (singleOpen) {
        return isOpen ? new Set<number>() : new Set([index]);
      }
      const next = new Set(current);
      if (isOpen) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function focusHeader(index: number) {
    const clamped = Math.max(0, Math.min(index, FAQS.length - 1));
    buttonRefs.current[clamped]?.focus();
  }

  function handleHeaderKeyDown(index: number) {
    return (event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusHeader(index + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusHeader(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusHeader(0);
          break;
        case 'End':
          event.preventDefault();
          focusHeader(FAQS.length - 1);
          break;
        default:
          break;
      }
    };
  }

  return (
    <main>
      <h2>Frequently asked questions</h2>
      {FAQS.map((faq, index) => (
        <FaqItem
          key={faq.question}
          faq={faq}
          open={openIndexes.has(index)}
          onToggle={() => toggle(index)}
          buttonRef={(node) => {
            buttonRefs.current[index] = node;
          }}
          onHeaderKeyDown={handleHeaderKeyDown(index)}
        />
      ))}
    </main>
  );
}
