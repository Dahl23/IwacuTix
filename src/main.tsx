import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Capture the PWA install prompt early before React components mount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as unknown as { __deferredPWAInstallPrompt?: Event }).__deferredPWAInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });
}

// Register service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[IwacuTix PWA] Mise à jour disponible.');
  },
  onOfflineReady() {
    console.log('[IwacuTix PWA] Application prête pour le mode hors-ligne.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
