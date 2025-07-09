import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function testElectronDev() {
  console.log('Starting Electron in dev mode with remote debugging...');
  
  // Start Electron with remote debugging
  const electronProcess = spawn('npm', ['run', 'electron:dev'], {
    env: { 
      ...process.env, 
      ELECTRON_ENABLE_LOGGING: '1',
      ELECTRON_REMOTE_DEBUGGING_PORT: '9222'
    },
    shell: true
  });

  electronProcess.stdout.on('data', (data) => {
    console.log('Electron stdout:', data.toString());
  });

  electronProcess.stderr.on('data', (data) => {
    console.log('Electron stderr:', data.toString());
  });

  // Wait for Electron to start
  await new Promise(resolve => setTimeout(resolve, 8000));

  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
      console.error('No browser contexts found');
      electronProcess.kill();
      process.exit(1);
    }

    const context = contexts[0];
    const pages = context.pages();
    
    console.log(`Found ${pages.length} pages`);

    for (const page of pages) {
      const url = page.url();
      const title = await page.title();
      console.log(`Page: ${title} - ${url}`);
      
      if (url.includes('index.html') || url.includes('localhost:3001')) {
        console.log('Testing main window...');
        
        // Wait for potential React render
        await page.waitForTimeout(3000);
        
        // Check if React root has content
        const rootContent = await page.evaluate(() => {
          const root = document.getElementById('root');
          return {
            exists: !!root,
            length: root ? root.innerHTML.length : 0,
            html: root ? root.innerHTML.substring(0, 200) : 'No root element'
          };
        });
        
        console.log('Root element:', rootContent);
        
        // Check for React in window
        const reactInfo = await page.evaluate(() => {
          return {
            React: !!window.React,
            ReactDOM: !!window.ReactDOM,
            reactRoot: !!window._reactRootContainer,
            dataReactRoot: !!document.querySelector('[data-reactroot]'),
            tankElements: document.querySelectorAll('.tank-card, .tank-display, [class*="tank"]').length
          };
        });
        
        console.log('React info:', reactInfo);
        
        // Check console errors
        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });
        
        // Take screenshot
        await page.screenshot({ path: 'electron-dev-test.png', fullPage: true });
        
        if (rootContent.length === 0) {
          console.error('FAILED: React not rendering - root element is empty');
          
          // Check for script loading
          const scripts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script')).map(s => ({
              src: s.src,
              type: s.type,
              loaded: !!s.src
            }));
          });
          console.log('Scripts:', scripts);
        } else {
          console.log('SUCCESS: React is rendering');
        }
        
        if (errors.length > 0) {
          console.log('Console errors:', errors);
        }
      }
    }

    await browser.close();
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    electronProcess.kill();
  }
}

testElectronDev().catch(console.error);