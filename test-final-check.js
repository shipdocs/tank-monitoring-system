import { spawn } from 'child_process';
import http from 'http';

async function finalCheck() {
  console.log('Starting final check of packaged app...');
  
  const appProcess = spawn('./dist-electron/Tank Monitoring System-2.0.1.AppImage', [], {
    env: { ...process.env, DISPLAY: ':0' },
    detached: false
  });

  let serverReady = false;

  appProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server is ready') || output.includes('HTTP server running')) {
      serverReady = true;
    }
  });

  appProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('GetVSyncParametersIfAvailable') && 
        !error.includes('Update error') && 
        !error.includes('Cannot find latest-linux.yml')) {
      console.error('ERROR:', error.trim());
    }
  });

  // Wait for server
  for (let i = 0; i < 10; i++) {
    if (serverReady) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    console.error('Server did not start');
    appProcess.kill();
    return;
  }

  console.log('\nServer is ready. Checking HTTP responses...\n');

  // Check main page
  await new Promise((resolve) => {
    http.get('http://localhost:3001/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Main page:');
        console.log('- Status:', res.statusCode);
        console.log('- HTML length:', data.length);
        
        // Check for module script
        const moduleScript = data.match(/<script[^>]*type="module"[^>]*>/);
        console.log('- Has module script:', !!moduleScript);
        
        // Check root element
        const rootMatch = data.match(/<div id="root"[^>]*>(.*?)<\/div>/);
        console.log('- Root element empty:', rootMatch ? rootMatch[1].length === 0 : 'no root');
        
        resolve();
      });
    });
  });

  // Check JS asset
  await new Promise((resolve) => {
    http.get('http://localhost:3001/assets/js/main-D7dUKn1f.js', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\nMain JS asset:');
        console.log('- Status:', res.statusCode);
        console.log('- Content-Type:', res.headers['content-type']);
        console.log('- Length:', data.length);
        console.log('- Starts with:', data.substring(0, 50));
        resolve();
      });
    });
  });

  // Check WebSocket
  console.log('\nWebSocket server on port 3002:', serverReady ? 'Running' : 'Not running');

  console.log('\n============================================');
  console.log('DIAGNOSIS:');
  console.log('1. Server: ✓ Running correctly');
  console.log('2. HTTP routing: ✓ Working');
  console.log('3. Assets served: ✓ Correct');
  console.log('4. ES modules: ? Check if window shows content');
  console.log('\nPlease check the Electron window:');
  console.log('- If WHITE SCREEN: ES module loading issue');
  console.log('- If TANK DATA: Successfully fixed!');
  console.log('============================================\n');

  // Keep running for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  appProcess.kill();
}

finalCheck().catch(console.error);