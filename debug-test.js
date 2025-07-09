import { chromium } from 'playwright';

async function debugTest() {
  console.log('🔍 Debugging React app loading...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Capture network failures
    const networkFailures = [];
    page.on('response', response => {
      if (!response.ok()) {
        networkFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    // Capture JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    console.log('📱 Loading main page with detailed monitoring...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait longer for React to load
    await page.waitForTimeout(10000);

    // Check what's actually in the DOM
    const rootHTML = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML : 'No root element';
    });

    // Check if React has loaded
    const reactLoaded = await page.evaluate(() => typeof window.React !== 'undefined' ||
             document.querySelector('[data-reactroot]') !== null ||
             document.querySelector('#root').children.length > 0);

    // Check for any React error boundaries
    const reactErrors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[data-react-error], .react-error, .error-boundary');
      return Array.from(errorElements).map(el => el.textContent);
    });

    // Get all loaded scripts
    const loadedScripts = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]')).map(script => ({
      src: script.src,
      loaded: script.readyState || 'unknown',
    })));

    console.log('\n📊 Debug Results:');
    console.log(`✅ Root HTML length: ${rootHTML.length} characters`);
    console.log(`✅ React loaded: ${reactLoaded}`);
    console.log(`✅ Console messages: ${consoleMessages.length}`);
    console.log(`✅ Network failures: ${networkFailures.length}`);
    console.log(`✅ JavaScript errors: ${jsErrors.length}`);
    console.log(`✅ React errors: ${reactErrors.length}`);

    if (rootHTML.length > 0 && rootHTML !== 'No root element') {
      console.log(`✅ Root content preview: "${rootHTML.substring(0, 200)}..."`);
    }

    if (consoleMessages.length > 0) {
      console.log('\n📝 Console Messages:');
      consoleMessages.slice(0, 5).forEach(msg => console.log(`   ${msg}`));
    }

    if (networkFailures.length > 0) {
      console.log('\n❌ Network Failures:');
      networkFailures.forEach(failure => console.log(`   ${failure}`));
    }

    if (jsErrors.length > 0) {
      console.log('\n❌ JavaScript Errors:');
      jsErrors.forEach(error => console.log(`   ${error}`));
    }

    if (reactErrors.length > 0) {
      console.log('\n❌ React Errors:');
      reactErrors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\n📜 Loaded Scripts:');
    loadedScripts.forEach(script => console.log(`   ${script.src} (${script.loaded})`));

    // Take a screenshot for visual confirmation
    await page.screenshot({ path: 'debug-main-test.png', fullPage: true });

    // Final assessment
    if (rootHTML.length > 50) {
      console.log('\n✅ React app appears to be loading content');
    } else {
      console.log('\n❌ React app is NOT loading - white screen confirmed');
      console.log('   Possible causes:');
      console.log('   - JavaScript execution errors');
      console.log('   - Module loading issues');
      console.log('   - React build problems');
      console.log('   - Asset path issues');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Debug test completed. Check debug-main-test.png');
  }
}

debugTest().catch(console.error);
