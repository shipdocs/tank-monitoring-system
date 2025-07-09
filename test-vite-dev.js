import { chromium } from 'playwright';

async function testViteDev() {
  console.log('🔍 Testing Vite dev server with ES2018 build...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      console.log(`[${type.toUpperCase()}] ${text}`);
    });
    
    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log(`[PAGE ERROR] ${error.message}`);
    });
    
    console.log('\n📱 Loading Vite dev server (http://localhost:5173)...');
    
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    // Wait for React to load
    await page.waitForTimeout(5000);
    
    // Check DOM state
    const domState = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        rootExists: !!root,
        rootHTML: root ? root.innerHTML : 'No root',
        rootChildren: root ? root.children.length : 0,
        bodyChildren: document.body.children.length,
        windowReact: typeof window.React,
        windowReactDOM: typeof window.ReactDOM,
        documentReadyState: document.readyState,
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        allText: document.body.innerText || document.body.textContent || '',
        title: document.title
      };
    });
    
    // Take screenshot
    await page.screenshot({ path: 'vite-dev-test.png', fullPage: true });
    
    console.log('\n📊 Vite Dev Server Results:');
    console.log(`✅ Title: "${domState.title}"`);
    console.log(`✅ Root element exists: ${domState.rootExists}`);
    console.log(`✅ Root children count: ${domState.rootChildren}`);
    console.log(`✅ Root HTML length: ${domState.rootHTML.length}`);
    console.log(`✅ Body children count: ${domState.bodyChildren}`);
    console.log(`✅ Document ready: ${domState.documentReadyState}`);
    console.log(`✅ Has React root: ${domState.hasReactRoot}`);
    console.log(`✅ Window.React: ${domState.windowReact}`);
    console.log(`✅ Window.ReactDOM: ${domState.windowReactDOM}`);
    console.log(`✅ All text length: ${domState.allText.length}`);
    
    console.log('\n📝 Summary:');
    console.log(`   Console messages: ${consoleMessages.length}`);
    console.log(`   Page errors: ${pageErrors.length}`);
    
    if (domState.rootChildren > 0 || domState.allText.length > 50) {
      console.log('\n🎉 SUCCESS: React app is working in Vite dev server!');
      console.log('   This confirms the ES2018 build target fixes the compatibility issue.');
      console.log('   The white screen was indeed caused by ES2020 compatibility problems.');
    } else if (pageErrors.length > 0) {
      console.log('\n❌ React app failed due to JavaScript errors in dev server too');
      pageErrors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('\n❌ React app still not working even in dev server');
      console.log('   This suggests a deeper issue beyond ES module compatibility');
    }
    
    if (domState.allText.length > 10) {
      console.log(`\n✅ Visible text preview: "${domState.allText.substring(0, 200)}..."`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Vite dev test completed. Check vite-dev-test.png');
  }
}

testViteDev().catch(console.error);
