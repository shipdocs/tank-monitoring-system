import { chromium } from 'playwright';

async function detailedDebug() {
  console.log('🔍 Detailed debugging of React app...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture ALL console messages with more detail
    const allMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      allMessages.push({ type, text, location });
      console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
      if (location.url) {
        console.log(`   at ${location.url}:${location.lineNumber}:${location.columnNumber}`);
      }
    });
    
    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    });
    
    // Capture request failures
    const requestFailures = [];
    page.on('requestfailed', request => {
      requestFailures.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
      console.log(`[REQUEST FAILED] ${request.method()} ${request.url()}`);
      console.log(`   Error: ${request.failure().errorText}`);
    });
    
    // Capture response failures
    const responseFailures = [];
    page.on('response', response => {
      if (!response.ok()) {
        responseFailures.push(`${response.status()} ${response.url()}`);
        console.log(`[RESPONSE ERROR] ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('\n📱 Loading main page with comprehensive monitoring...');
    
    try {
      await page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
    } catch (error) {
      console.log(`[NAVIGATION ERROR] ${error.message}`);
    }
    
    // Wait for potential React loading
    console.log('⏳ Waiting for React to load...');
    await page.waitForTimeout(15000);
    
    // Check DOM state
    const domState = await page.evaluate(() => {
      const root = document.getElementById('root');
      const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
        src: s.src,
        type: s.type,
        loaded: s.readyState
      }));
      
      return {
        rootExists: !!root,
        rootHTML: root ? root.innerHTML : 'No root',
        rootChildren: root ? root.children.length : 0,
        bodyChildren: document.body.children.length,
        scripts: scripts,
        windowReact: typeof window.React,
        windowReactDOM: typeof window.ReactDOM,
        documentReadyState: document.readyState,
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        allText: document.body.innerText || document.body.textContent || ''
      };
    });
    
    // Try to manually trigger React if it exists
    const reactStatus = await page.evaluate(() => {
      try {
        if (window.React) {
          return 'React is available';
        }
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          return 'React DevTools hook found';
        }
        return 'React not found';
      } catch (e) {
        return `Error checking React: ${e.message}`;
      }
    });
    
    console.log('\n📊 Detailed Debug Results:');
    console.log(`✅ Root element exists: ${domState.rootExists}`);
    console.log(`✅ Root children count: ${domState.rootChildren}`);
    console.log(`✅ Root HTML length: ${domState.rootHTML.length}`);
    console.log(`✅ Body children count: ${domState.bodyChildren}`);
    console.log(`✅ Document ready state: ${domState.documentReadyState}`);
    console.log(`✅ Has React root: ${domState.hasReactRoot}`);
    console.log(`✅ Window.React: ${domState.windowReact}`);
    console.log(`✅ Window.ReactDOM: ${domState.windowReactDOM}`);
    console.log(`✅ React status: ${reactStatus}`);
    console.log(`✅ All text length: ${domState.allText.length}`);
    
    console.log('\n📜 Scripts loaded:');
    domState.scripts.forEach(script => {
      console.log(`   ${script.src || 'inline'} (type: ${script.type || 'text/javascript'}, state: ${script.loaded || 'unknown'})`);
    });
    
    console.log('\n📝 Summary:');
    console.log(`   Console messages: ${allMessages.length}`);
    console.log(`   Page errors: ${pageErrors.length}`);
    console.log(`   Request failures: ${requestFailures.length}`);
    console.log(`   Response failures: ${responseFailures.length}`);
    
    if (domState.rootHTML.length > 10) {
      console.log(`\n✅ Root content preview: "${domState.rootHTML.substring(0, 300)}..."`);
    }
    
    if (domState.allText.length > 10) {
      console.log(`\n✅ Visible text preview: "${domState.allText.substring(0, 200)}..."`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'detailed-debug-test.png', fullPage: true });
    
    // Final diagnosis
    if (domState.rootChildren > 0 || domState.allText.length > 50) {
      console.log('\n🎉 React app appears to be working!');
    } else if (pageErrors.length > 0) {
      console.log('\n❌ React app failed due to JavaScript errors');
    } else if (requestFailures.length > 0 || responseFailures.length > 0) {
      console.log('\n❌ React app failed due to network issues');
    } else {
      console.log('\n❌ React app failed for unknown reasons - silent failure');
      console.log('   The JavaScript loads but React components are not rendering');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Detailed debug completed. Check detailed-debug-test.png');
  }
}

detailedDebug().catch(console.error);
