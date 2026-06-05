/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA Service Worker for offline-first local operations
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const swPath = baseUrl.endsWith('/') ? `${baseUrl}sw.js` : `${baseUrl}/sw.js`;
    
    navigator.serviceWorker.register(swPath)
      .then(reg => {
        console.log('PWA Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.error('PWA Service Worker registration failed:', err);
      });
  });
}
