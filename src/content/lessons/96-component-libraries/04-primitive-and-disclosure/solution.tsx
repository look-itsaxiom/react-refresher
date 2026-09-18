import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AnyProps = Record<string, unknown>;
type ClassNameProp = string | ((state: { open: boolean }) => string) | undefined;

// ---------------------------------------------------------------------------
// mergeProps
// ---------------------------------------------------------------------------

function isEventHandlerKey(key: string) {
  return key.length > 2 && key.startsWith('on') && key[2] === key[2]?.toUpperCase();
}

export function mergeProps(...propsList: Array<AnyProps | undefined>): AnyProps {
  const result: AnyProps = {};

  for (const props of propsList) {
    if (!props) continue;

    for (const key of Object.keys(props)) {
      const value = props[key];
      if (value === undefined) continue;

      if (isEventHandlerKey(key) && typeof value === 'function') {
        const existing = result[key];
        result[key] =
          typeof existing === 'function'
            ? (...args: unknown[]) => {
                (existing as (...a: unknown[]) => void)(...args);
                (value as (...a: unknown[]) => void)(...args);
              }
            : value;
      } else if (key === 'style' && typeof value === 'object' && value !== null) {
        result[key] = { ...((result[key] as object) ?? {}), ...(value as object) };
      } else if (key === 'className') {
        result[key] = [result[key], value].filter(Boolean).join(' ');
      } else {
        result[key] = value;
      }
    }
  }

  return result;
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

function resolveClassName(className: ClassNameProp, state: { open: boolean }): string | undefined {
  return typeof className === 'function' ? className(state) : className;
}

function Trigger({
  className,
  children,
  ...rest
}: { className?: ClassNameProp; children: ReactNode } & AnyProps) {
  const { open, setOpen, triggerId, contentId } = useDisclosureContext('Disclosure.Trigger');

  const merged = mergeProps(
    {
      id: triggerId,
      type: 'button',
      'aria-expanded': open,
      'aria-controls': contentId,
      'data-state': open ? 'open' : 'closed',
      className: resolveClassName(className, { open }),
      onClick: () => setOpen(!open),
    },
    rest,
  );

  return <button {...merged}>{children}</button>;
}

function Content({
  className,
  forceMount,
  children,
  ...rest
}: { className?: ClassNameProp; forceMount?: boolean; children: ReactNode } & AnyProps) {
  const { open, triggerId, contentId } = useDisclosureContext('Disclosure.Content');
  if (!open && !forceMount) return null;

  const merged = mergeProps(
    {
      id: contentId,
      role: 'region',
      'aria-labelledby': triggerId,
      'data-state': open ? 'open' : 'closed',
      hidden: !open,
      className: resolveClassName(className, { open }),
    },
    rest,
  );

  return <div {...merged}>{children}</div>;
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
  const target = container ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;
  return createPortal(children, target);
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
