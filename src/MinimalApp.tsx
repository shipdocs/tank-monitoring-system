import React from 'react';

// Minimal React component for testing
export function MinimalApp() {
  console.log('MinimalApp component rendering');

  return (
    <div style={{ padding: '50px', textAlign: 'center', background: '#f0f0f0', height: '100vh' }}>
      <h1>Electron ES Module Test</h1>
      <p>If you can see this, React is working!</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
}
