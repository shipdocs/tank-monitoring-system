import { chromium } from 'playwright';

async function testModuleLoading() {
  console.log('🔍 Testing ES module loading...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();

    // Capture all console messages including module errors
    const allMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      allMessages.push({ type, text });
      console.log(`[${type.toUpperCase()}] ${text}`);
    });

    // Capture page errors (including module errors)
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`[STACK] ${error.stack}`);
    });

    // Capture request failures
    page.on('requestfailed', request => {
      console.log(`[REQUEST FAILED] ${request.method()} ${request.url()}`);
      console.log(`[ERROR] ${request.failure().errorText}`);
    });

    // Capture response failures
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`[RESPONSE ERROR] ${response.status()} ${response.url()}`);
      }
    });

    console.log('\n📱 Loading page and monitoring module execution...');

    await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for modules to load
    await page.waitForTimeout(10000);

    // Check if the main script loaded and executed
    const moduleStatus = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
      const mainScript = scripts.find(s => s.src.includes('main-'));

      return {
        moduleScriptsCount: scripts.length,
        mainScriptExists: !!mainScript,
        mainScriptSrc: mainScript ? mainScript.src : null,
        mainScriptLoaded: mainScript ? mainScript.readyState : null,
        documentReadyState: document.readyState,
        rootElement: !!document.getElementById('root'),
        rootContent: document.getElementById('root')?.innerHTML || '',
        bodyContent: document.body.innerHTML,
        windowKeys: Object.keys(window).filter(key => key.includes('React') || key.includes('react')),
        errors: window.errors || [],
      };
    });

    // Try to manually check if React is available
    const reactCheck = await page.evaluate(() => {
      try {
        // Check for React in various ways
        const checks = {
          windowReact: typeof window.React,
          windowReactDOM: typeof window.ReactDOM,
          reactDevTools: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
          reactFiber: !!document.querySelector('[data-reactroot]'),
          reactElements: document.querySelectorAll('[data-react-*]').length,
          globalThis: typeof globalThis.React,
          moduleErrors: [],
        };

        // Try to access the module
        try {
          if (window.module) {
            checks.moduleSystem = 'available';
          }
        } catch (e) {
          checks.moduleErrors.push(e.message);
        }

        return checks;
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('\n📊 Module Loading Results:');
    console.log(`✅ Module scripts found: ${moduleStatus.moduleScriptsCount}`);
    console.log(`✅ Main script exists: ${moduleStatus.mainScriptExists}`);
    console.log(`✅ Main script src: ${moduleStatus.mainScriptSrc}`);
    console.log(`✅ Main script loaded: ${moduleStatus.mainScriptLoaded}`);
    console.log(`✅ Document ready: ${moduleStatus.documentReadyState}`);
    console.log(`✅ Root element: ${moduleStatus.rootElement}`);
    console.log(`✅ Root content length: ${moduleStatus.rootContent.length}`);
    console.log(`✅ React-related window keys: ${moduleStatus.windowKeys.join(', ') || 'none'}`);

    console.log('\n🔍 React Detection:');
    console.log(`✅ window.React: ${reactCheck.windowReact}`);
    console.log(`✅ window.ReactDOM: ${reactCheck.windowReactDOM}`);
    console.log(`✅ React DevTools: ${reactCheck.reactDevTools}`);
    console.log(`✅ React Fiber: ${reactCheck.reactFiber}`);
    console.log(`✅ React elements: ${reactCheck.reactElements}`);
    console.log(`✅ globalThis.React: ${reactCheck.globalThis}`);

    if (reactCheck.moduleErrors && reactCheck.moduleErrors.length > 0) {
      console.log(`❌ Module errors: ${reactCheck.moduleErrors.join(', ')}`);
    }

    console.log('\n📝 Summary:');
    console.log(`   Console messages: ${allMessages.length}`);
    console.log(`   Page errors: ${pageErrors.length}`);

    if (pageErrors.length > 0) {
      console.log('\n❌ Page Errors:');
      pageErrors.forEach(error => console.log(`   ${error}`));
    }

    // Final diagnosis
    if (moduleStatus.rootContent.length > 50) {
      console.log('\n🎉 React app is working!');
    } else if (pageErrors.length > 0) {
      console.log('\n❌ Module loading failed due to JavaScript errors');
    } else if (!moduleStatus.mainScriptExists) {
      console.log('\n❌ Main module script not found');
    } else {
      console.log('\n❌ Module loaded but React not executing - possible ES module compatibility issue');
      console.log('   This suggests the ES module loads but fails to execute React components');
      console.log('   Common causes:');
      console.log('   - ES module compatibility issues in Electron');
      console.log('   - Missing polyfills for ES2020 features');
      console.log('   - Module resolution problems');
      console.log('   - Silent errors in the React initialization');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testModuleLoading().catch(console.error);
