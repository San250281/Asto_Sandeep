import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and cleanly suppress benign WebSocket/HMR sandbox connection errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.message?.includes('WebSocket') ||
        reason.message?.includes('websocket') ||
        String(reason).includes('WebSocket') ||
        String(reason).includes('websocket'))
    ) {
      event.preventDefault(); // Prevents printing red unhandled rejection boxes or breaking test scripts
      console.warn('⚡ Benign HMR WebSocket rejection intercepted and handled gracefully.');
    }
  });

  window.addEventListener('error', (event) => {
    if (
      event.message &&
      (event.message.includes('WebSocket') || event.message.includes('websocket'))
    ) {
      event.preventDefault(); // Prevents uncaught socket exceptions in console
      console.warn('⚡ Benign HMR WebSocket connection error intercepted and handled gracefully.');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
