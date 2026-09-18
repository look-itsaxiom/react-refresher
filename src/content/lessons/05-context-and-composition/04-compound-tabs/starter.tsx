import { useState, type ReactNode } from 'react';

// TODO: replace this prop-threading with a TabsContext.

function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [activeValue, setActiveValue] = useState(defaultValue);
  return <div data-testid="tabs">{children}</div>;
}

function TabsList({ children }: { children: ReactNode }) {
  return (
    <div role="tablist" data-testid="tabs-list">
      {children}
    </div>
  );
}

function TabsTab({ value, children }: { value: string; children: ReactNode }) {
  // TODO: read the active value from context and know how to change it.
  const isActive = false;
  return (
    <button role="tab" aria-selected={isActive} onClick={() => {}}>
      {children}
    </button>
  );
}

function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  // TODO: read the active value from context and only render when it matches `value`.
  const isActive = false;
  if (!isActive) return null;
  return <div role="tabpanel">{children}</div>;
}

Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;

export default function App() {
  return (
    <Tabs defaultValue="profile">
      <Tabs.List>
        <Tabs.Tab value="profile">Profile</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile content</Tabs.Panel>
      <Tabs.Panel value="settings">Settings content</Tabs.Panel>
    </Tabs>
  );
}
