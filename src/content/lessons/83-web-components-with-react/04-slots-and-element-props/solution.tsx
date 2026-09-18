import { Children, cloneElement, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';

// --- Provided: a minimal <x-card> custom element with three shadow-DOM slots ------------
// A fresh, unique tag is registered every time this module is evaluated, so this exercise's
// checks (each a fresh module evaluation) never collide with each other in the same registry.

class XCardElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <div part="card">
        <header part="header"><slot name="title"></slot></header>
        <section part="body"><slot></slot></section>
        <footer part="footer"><slot name="footer"></slot></footer>
      </div>
    `;
  }
}

const CARD_TAG = `x-card-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, XCardElement);
}

// --- Your work: assignSlots --------------------------------------------------------------

/**
 * Clone `children`, giving each child whose `key` appears in `mapping` a `slot` attribute
 * equal to `mapping[key]`. Children with no matching key, or that aren't valid elements,
 * pass through unchanged.
 */
export function assignSlots(children: ReactNode, mapping: Record<string, string>): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child) || child.key == null) return child;
    // Children.map/Children.forEach prefix an explicit key with ".$" internally (e.g. "heading"
    // becomes ".$heading"); strip it back off before matching against the caller's mapping.
    const key = child.key.startsWith('.$') ? child.key.slice(2) : child.key;
    const slot = mapping[key];
    return slot ? cloneElement(child as ReactElement<Record<string, unknown>>, { slot }) : child;
  });
}

function XCard({ children }: { children: ReactNode }) {
  const mapped = assignSlots(children, { heading: 'title', foot: 'footer' });
  return createElement(CARD_TAG, { 'data-testid': 'card' }, mapped);
}

// --- Your work: elementProps ---------------------------------------------------------------

export type ElementPropsResult = {
  properties: Record<string, unknown>;
  attributes: Record<string, string>;
  listeners: Record<string, (event: Event) => void>;
};

/**
 * Model React 19's client-side decision for a single custom element's props, without a real
 * DOM: for each key in `props`, decide whether it becomes a property (matches `instance`), an
 * attribute, an event listener (`on*` + function), or is omitted. See prompt.md for the exact
 * rules.
 */
export function elementProps(props: Record<string, unknown>, instance: Record<string, unknown>): ElementPropsResult {
  const properties: Record<string, unknown> = {};
  const attributes: Record<string, string> = {};
  const listeners: Record<string, (event: Event) => void> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') {
      if (typeof value === 'string') attributes.class = value;
      continue;
    }
    if (key === 'style' && value !== null && typeof value === 'object') {
      attributes.style = Object.entries(value as Record<string, string>)
        .map(([cssProp, cssValue]) => `${cssProp}: ${cssValue};`)
        .join(' ');
      continue;
    }
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2);
      listeners[eventName] = value as (event: Event) => void;
      continue;
    }
    if (key in instance) {
      properties[key] = value;
      continue;
    }
    if (typeof value === 'function') {
      continue; // no matching property, not an event listener: nothing to do with it
    }
    if (value === true) {
      attributes[key] = '';
    } else if (value === false || value === null || value === undefined) {
      // omitted entirely
    } else {
      attributes[key] = String(value);
    }
  }

  return { properties, attributes, listeners };
}

export default function App() {
  return (
    <XCard>
      <h3 key="heading">Plan</h3>
      <p key="body">Body text</p>
      <span key="foot">42 seats</span>
    </XCard>
  );
}
