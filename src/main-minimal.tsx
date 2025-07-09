console.log('main-minimal.tsx loading...');

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MinimalApp } from './MinimalApp';

console.log('Imports loaded, creating root...');

// Add global error handlers
window.addEventListener('error', (e) => {
  console.error('Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  console.log('DOM ready, initializing React...');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found!');
    return;
  }

  console.log('Root element found:', rootElement);

  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('React root created');

    root.render(
      <React.StrictMode>
        <MinimalApp />
      </React.StrictMode>,
    );

    console.log('React render called');

    // Add to window for debugging
    (window as any).__reactRoot = root;
    (window as any).__reactMounted = true;

  } catch (error) {
    console.error('Failed to initialize React:', error);
  }
}
