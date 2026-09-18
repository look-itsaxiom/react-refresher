import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import './index.css';
import { router } from './app/router';
import { progressStore } from './app/progress/useProgress';
import { initTheme } from './app/theme';

initTheme();
void progressStore.load();
window.addEventListener('pagehide', () => { void progressStore.flush(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
