import { createElement, useImperativeHandle, useRef, useState, type Ref } from 'react';

// --- Provided: a minimal <x-rating> custom element -------------------------------------
// A fresh, unique tag is registered every time this module is evaluated, so this exercise's
// checks (each a fresh module evaluation) never collide with each other in the same registry.

class XRatingElement extends HTMLElement {
  private _value = 0;
  max = 5;

  get value() {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
    this.renderText();
  }

  reset() {
    this.value = 0;
    this.dispatchEvent(new CustomEvent('rating-change', { detail: { value: 0 }, bubbles: true }));
  }

  connectedCallback() {
    this.renderText();
    this.addEventListener('click', this.handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  private handleClick = () => {
    const next = this._value >= this.max ? 0 : this._value + 1;
    this.value = next;
    this.dispatchEvent(new CustomEvent('rating-change', { detail: { value: next }, bubbles: true }));
  };

  private renderText() {
    this.textContent = `${this._value}/${this.max}`;
  }
}

const RATING_TAG = `x-rating-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
if (!customElements.get(RATING_TAG)) {
  customElements.define(RATING_TAG, XRatingElement);
}

// --- Your work: a typed wrapper ---------------------------------------------------------

export type RatingHandle = { reset(): void };

type RatingProps = {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  ref?: Ref<RatingHandle>;
};

function Rating({ value, max = 5, onChange, ref }: RatingProps) {
  // TODO: keep a ref to the underlying <x-rating> element.
  // TODO: useImperativeHandle(ref, () => ({ reset() { ... } }))
  // TODO: attach/remove a 'rating-change' listener that calls onChange(detail.value).
  // TODO: keep `value` and `max` in sync as real properties on the element every render.

  return createElement(RATING_TAG, {
    'data-testid': 'rating',
    value,
    max,
  });
}

export default function App() {
  const [value, setValue] = useState(2);
  const handle = useRef<RatingHandle>(null);

  return (
    <main>
      <Rating value={value} max={5} onChange={setValue} ref={handle} />
      <p>Current: {value}</p>
      <button onClick={() => handle.current?.reset()}>Reset</button>
    </main>
  );
}
