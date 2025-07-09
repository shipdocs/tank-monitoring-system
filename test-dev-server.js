import { spawn } from 'child_process';
import http from 'http';

async function testDevServer() {
  console.log('Starting development server test...');
  
  // Start dev server
  const viteProcess = spawn('npm', ['run', 'dev:frontend'], {
    shell: true,
    env: process.env
  });

  viteProcess.stdout.on('data', (data) => {
    console.log('Vite:', data.toString());
  });

  viteProcess.stderr.on('data', (data) => {
    console.error('Vite error:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check if Vite dev server works
  await new Promise((resolve) => {
    http.get('http://localhost:5173/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\nVite dev server response:');
        console.log('- Status:', res.statusCode);
        console.log('- HTML length:', data.length);
        
        // Check for module script
        const moduleScript = data.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
        console.log('- Module script:', moduleScript ? moduleScript[1] : 'not found');
        
        resolve();
      });
    }).on('error', (err) => {
      console.error('Request error:', err);
      resolve();
    });
  });

  // Now start Electron pointing to dev server
  console.log('\nStarting Electron with dev server...');
  
  const electronProcess = spawn('electron', ['.'], {
    env: { 
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://localhost:5173'
    },
    shell: true
  });

  electronProcess.stdout.on('data', (data) => {
    console.log('Electron:', data.toString());
  });

  electronProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('GetVSyncParametersIfAvailable')) {
      console.error('Electron error:', error);
    }
  });

  // Keep running for 20 seconds
  await new Promise(resolve => setTimeout(resolve, 20000));

  electronProcess.kill();
  viteProcess.kill();
  
  console.log('\nTest complete. Check if the Electron window showed the React app.');
}

testDevServer().catch(console.error);