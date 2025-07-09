// Add immediate console log to test if JS is executing
console.log('🔥 JavaScript is executing!');
console.log('🔥 Window object:', typeof window);
console.log('🔥 Document object:', typeof document);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { TankDataProvider } from './components/TankDataProvider';
import { AccessibilityProvider } from './components/AccessibilityProvider';

// Simple test to see if React can mount at all
console.log('🚀 Starting React app...');
console.log('Root element:', document.getElementById('root'));

console.log('🎯 About to mount React app...');
console.log('🎯 Root element:', document.getElementById('root'));

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
  } else {
    console.log('✅ Root element found, creating React root...');
    const root = createRoot(rootElement);
    console.log('✅ React root created, rendering app...');

    root.render(
      <StrictMode>
        <AccessibilityProvider>
          <TankDataProvider>
            <App />
          </TankDataProvider>
        </AccessibilityProvider>
      </StrictMode>,
    );

    console.log('✅ React app rendered successfully!');
  }
} catch (error) {
  console.error('❌ Error mounting React app:', error);
}
