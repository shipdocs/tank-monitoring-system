// Test React app loading with Playwright
import { chromium } from 'playwright';

async function testReactApp() {
  console.log('Starting React app test...');

  // Start the integrated server
  const { spawn } = await import('child_process');
  const server = spawn('node', ['electron/integrated-server.js'], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  // Capture server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('HTTP server running')) {
      console.log('✅ Server started successfully');
    }
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('✅')) {
        console.log('React console:', msg.text());
      }
      if (msg.type() === 'error') {
        console.error('React error:', msg.text());
      }
    });

    console.log('Loading http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Check React app status
    const appStatus = await page.evaluate(() => {
      const root = document.getElementById('root');
      const hasContent = root && root.children.length > 0;
      const hasTankGrid = !!document.querySelector('[role="main"]');
      const hasHeader = !!document.querySelector('header');
      const hasFooter = !!document.querySelector('footer');

      return {
        rootExists: !!root,
        hasContent,
        hasTankGrid,
        hasHeader,
        hasFooter,
        rootHTML: root ? (`${root.innerHTML.substring(0, 200)}...`) : 'No root element',
        title: document.title,
      };
    });

    console.log('\n📊 React App Status:');
    console.log('- Root element exists:', appStatus.rootExists);
    console.log('- Has content:', appStatus.hasContent);
    console.log('- Has tank grid:', appStatus.hasTankGrid);
    console.log('- Has header:', appStatus.hasHeader);
    console.log('- Has footer:', appStatus.hasFooter);
    console.log('- Page title:', appStatus.title);

    if (appStatus.hasContent && appStatus.hasTankGrid) {
      console.log('\n✅ SUCCESS: React Tank Monitoring Dashboard is rendering correctly!');
    } else {
      console.log('\n❌ FAIL: React app not fully rendered');
      console.log('Root HTML preview:', appStatus.rootHTML);
    }

    await browser.close();
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Kill the server
    server.kill();
    process.exit(0);
  }
}

testReactApp().catch(console.error);
