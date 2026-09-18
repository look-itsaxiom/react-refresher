import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AnyProps = Record<string, unknown>;
type ClassNameProp = string | ((state: { open: boolean }) => string) | undefined;

// ---------------------------------------------------------------------------
// mergeProps
// ---------------------------------------------------------------------------

export function mergeProps(..._propsList: Array<AnyProps | undefined>): AnyProps {
  // TODO: fold propsList into one object following the rules in the prompt:
  // undefined is skipped, className concatenates, style shallow-merges, on* handlers
  // compose in argument order, everything else last-defined-wins.
  return {};
}

// ---------------------------------------------------------------------------
// useControllableState (reimplemented here; each exercise's module is standalone)
// ---------------------------------------------------------------------------

function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (value: T) => void] {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;

  function setValue(next: T) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  return [current, setValue];
}

// ---------------------------------------------------------------------------
// Disclosure
// ---------------------------------------------------------------------------

type DisclosureContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
};

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

function useDisclosureContext(component: string) {
  const ctx = useContext(DisclosureContext);
  if (!ctx) throw new Error(`${component} must be used inside <Disclosure.Root>`);
  return ctx;
}

function Root({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [current, setCurrent] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const baseId = useId();

  return (
    <DisclosureContext.Provider
      value={{ open: current, setOpen: setCurrent, triggerId: `${baseId}-trigger`, contentId: `${baseId}-content` }}
    >
      {children}
    </DisclosureContext.Provider>
  );
}

function Trigger({
  className,
  children,
  ...rest
}: { className?: ClassNameProp; children: ReactNode } & AnyProps) {
  const { open, triggerId, contentId } = useDisclosureContext('Disclosure.Trigger');
  void open;
  void triggerId;
  void contentId;
  void className;

  // TODO: resolve a function-form className, then render a <button> with
  // aria-expanded/aria-controls/data-state and a toggling onClick, merging `rest` in
  // with mergeProps.
  return (
    <button type="button" {...rest}>
      {children}
    </button>
  );
}

function Content({
  className,
  forceMount,
  children,
  ...rest
}: { className?: ClassNameProp; forceMount?: boolean; children: ReactNode } & AnyProps) {
  const { open, triggerId, contentId } = useDisclosureContext('Disclosure.Content');
  void open;
  void triggerId;
  void contentId;
  void className;
  void forceMount;

  // TODO: render role="region" with aria-labelledby/data-state, staying mounted (with
  // `hidden`) when forceMount is set, otherwise returning null while closed.
  return (
    <div role="region" {...rest}>
      {children}
    </div>
  );
}

export const Disclosure = { Root, Trigger, Content };

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

export function Portal({
  children,
  container,
}: {
  children: ReactNode;
  container?: Element | DocumentFragment | null;
}) {
  // TODO: portal `children` into `container`, falling back to document.body.
  void container;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <main>
      <Disclosure.Root defaultOpen={false}>
        <Disclosure.Trigger className={({ open }: { open: boolean }) => `disclosure-trigger${open ? ' is-open' : ''}`}>
          Toggle details
        </Disclosure.Trigger>
        <Disclosure.Content className={({ open }: { open: boolean }) => `disclosure-content${open ? ' is-open' : ''}`}>
          Here are the details, revealed when open.
        </Disclosure.Content>
      </Disclosure.Root>
      <Portal>
        <p data-testid="portal-note">Rendered via a portal into document.body.</p>
      </Portal>
    </main>
  );
}
