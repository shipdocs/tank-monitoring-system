import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

const appPath = path.join(process.cwd(), 'dist-electron', 'Tank Monitoring System-2.0.1.AppImage');

async function testPackagedApp() {
  console.log('Starting AppImage:', appPath);
  
  // Start the AppImage
  const appProcess = spawn(appPath, [], {
    env: { ...process.env, DISPLAY: ':0' },
    detached: false
  });

  appProcess.stdout.on('data', (data) => {
    console.log('AppImage stdout:', data.toString());
  });

  appProcess.stderr.on('data', (data) => {
    console.log('AppImage stderr:', data.toString());
  });

  // Wait for app to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  
  if (contexts.length === 0) {
    console.error('No browser contexts found');
    appProcess.kill();
    process.exit(1);
  }

  const context = contexts[0];
  const pages = context.pages();
  
  console.log(`Found ${pages.length} pages`);

  for (const page of pages) {
    const url = page.url();
    const title = await page.title();
    console.log(`Page: ${title} - ${url}`);
    
    if (url.includes('index.html')) {
      console.log('Testing main window...');
      
      // Check if React root has content
      const rootContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.length : 0;
      });
      
      console.log(`Root element content length: ${rootContent}`);
      
      // Check for React in window
      const hasReact = await page.evaluate(() => {
        return !!(window.React || window._reactRootContainer || document.querySelector('[data-reactroot]'));
      });
      
      console.log(`React detected: ${hasReact}`);
      
      // Check for tank components
      const tankElements = await page.locator('.tank-card, .tank-display, [class*="tank"]').count();
      console.log(`Tank elements found: ${tankElements}`);
      
      // Take screenshot
      await page.screenshot({ path: 'packaged-app-main.png', fullPage: true });
      
      if (rootContent === 0) {
        console.error('FAILED: React not rendering - root element is empty');
      } else {
        console.log('SUCCESS: React is rendering');
      }
    }
  }

  await browser.close();
  appProcess.kill();
}

testPackagedApp().catch(console.error);