import { spawn } from 'child_process';
import http from 'http';

async function checkServerResponse() {
  return new Promise((resolve) => {
    http.get('http://localhost:3001/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Server response status:', res.statusCode);
        console.log('HTML length:', data.length);

        // Check if React root exists
        const rootMatch = data.match(/<div id="root"[^>]*>(.*?)<\/div>/);
        if (rootMatch) {
          console.log('Root element content length:', rootMatch[1].length);
        }

        // Check script tags
        const scriptMatches = data.match(/<script[^>]*>/g);
        console.log('Script tags found:', scriptMatches ? scriptMatches.length : 0);

        resolve();
      });
    }).on('error', (err) => {
      console.error('Request error:', err);
      resolve();
    });
  });
}

async function testPackagedApp() {
  console.log('Starting packaged AppImage...');

  const appProcess = spawn('./dist-electron/Tank Monitoring System-2.0.1.AppImage', [], {
    env: { ...process.env, DISPLAY: ':0' },
    detached: false,
  });

  let serverReady = false;

  appProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('App:', output.trim());

    if (output.includes('Server is ready') || output.includes('HTTP server running')) {
      serverReady = true;
    }
  });

  appProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('GetVSyncParametersIfAvailable') && !error.includes('Update error')) {
      console.error('App error:', error.trim());
    }
  });

  // Wait for server to be ready
  for (let i = 0; i < 10; i++) {
    if (serverReady) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (serverReady) {
    console.log('\nChecking server response...');
    await checkServerResponse();

    // Also check a JS asset
    http.get('http://localhost:3001/assets/js/main-D7dUKn1f.js', (res) => {
      console.log('JS asset status:', res.statusCode);
      console.log('JS asset content-type:', res.headers['content-type']);
    });
  } else {
    console.error('Server did not start in time');
  }

  // Give it time to show window
  console.log('\nApp should be showing. Check if window displays content.');
  await new Promise(resolve => setTimeout(resolve, 10000));

  appProcess.kill();
}

testPackagedApp().catch(console.error);
