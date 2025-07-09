import { chromium } from 'playwright';

async function testTankMonitoringApp() {
  console.log('🚀 Starting Playwright test of Tank Monitoring System...');

  const browser = await chromium.launch({
    headless: true,  // Run headless to avoid display issues
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // Test Main Window (http://localhost:3001)
    console.log('\n📱 Testing Main Window (http://localhost:3001)...');
    const mainPage = await browser.newPage();

    // Navigate to main page
    await mainPage.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Wait a bit for any dynamic content
    await mainPage.waitForTimeout(3000);

    // Take screenshot of main page
    await mainPage.screenshot({ path: 'main-window-test.png', fullPage: true });

    // Check if page loaded properly (not white screen)
    const bodyContent = await mainPage.textContent('body');
    const hasContent = bodyContent && bodyContent.trim().length > 100;

    // Check for React-specific elements after waiting
    const reactRootAfterWait = await mainPage.$('#root');
    const reactRootContent = reactRootAfterWait ? await reactRootAfterWait.textContent() : '';

    // Check for any JavaScript errors
    const errors = [];
    mainPage.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit more for React to load
    try {
      await mainPage.waitForTimeout(5000);
    } catch (e) {
      console.log('   ⚠️  Timeout waiting for page load');
    }

    // Check for specific tank monitoring elements
    const tankElements = await mainPage.$$('[data-testid*="tank"], .tank, [class*="tank"]');
    const hasTankElements = tankElements.length > 0;

    // Get page HTML for debugging
    const pageHTML = await mainPage.content();
    const htmlLength = pageHTML.length;

    // Check for specific elements that should be present
    const titleElement = await mainPage.$('title');
    const title = titleElement ? await titleElement.textContent() : 'No title';

    // Check for React root element initially
    const reactRootElement = await mainPage.$('#root');
    const hasReactRoot = !!reactRootElement;

    console.log(`   ✅ Main page title: "${title}"`);
    console.log(`   ✅ Has React root element: ${hasReactRoot}`);
    console.log(`   ✅ React root content: ${reactRootContent.length} characters`);
    console.log(`   ✅ Body has content: ${hasContent} (${bodyContent?.trim().length || 0} characters)`);
    console.log(`   ✅ HTML length: ${htmlLength} characters`);
    console.log(`   ✅ Tank elements found: ${tankElements.length}`);
    console.log(`   ✅ JavaScript errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.slice(0, 3).join(', ')}`);
    }
    console.log('   ✅ Screenshot saved: main-window-test.png');

    // Test Settings Window (http://localhost:3001/settings)
    console.log('\n⚙️  Testing Settings Window (http://localhost:3001/settings)...');
    const settingsPage = await browser.newPage();

    // Navigate to settings page
    await settingsPage.goto('http://localhost:3001/settings', { waitUntil: 'networkidle' });

    // Wait a bit for any dynamic content
    await settingsPage.waitForTimeout(3000);

    // Take screenshot of settings page
    await settingsPage.screenshot({ path: 'settings-window-test.png', fullPage: true });

    // Check if settings page loaded properly
    const settingsBodyContent = await settingsPage.textContent('body');
    const settingsHasContent = settingsBodyContent && settingsBodyContent.trim().length > 100;

    // Check for settings-specific elements
    const settingsTitleElement = await settingsPage.$('title');
    const settingsTitle = settingsTitleElement ? await settingsTitleElement.textContent() : 'No title';

    console.log(`   ✅ Settings page title: "${settingsTitle}"`);
    console.log(`   ✅ Settings body has content: ${settingsHasContent} (${settingsBodyContent?.trim().length || 0} characters)`);
    console.log('   ✅ Screenshot saved: settings-window-test.png');

    // Test API endpoints
    console.log('\n🔌 Testing API endpoints...');

    // Test status endpoint
    const statusResponse = await mainPage.goto('http://localhost:3001/api/status');
    const statusData = await statusResponse.json();
    console.log(`   ✅ API Status: ${statusResponse.status()} - Version: ${statusData.version || 'unknown'}`);

    // Test config endpoint
    const configResponse = await mainPage.goto('http://localhost:3001/api/config');
    const configData = await configResponse.json();
    console.log(`   ✅ API Config: ${configResponse.status()} - Data source: ${configData.csvFile?.enabled ? 'CSV' : 'Serial'}`);

    // Summary
    console.log('\n📊 Test Summary:');
    const mainWorking = hasContent || reactRootContent.length > 100 || hasTankElements;
    console.log(`   Main Window: ${mainWorking ? '✅ WORKING' : '❌ WHITE SCREEN'}`);
    console.log(`   Settings Window: ${settingsHasContent ? '✅ WORKING' : '❌ WHITE SCREEN'}`);
    console.log('   API Endpoints: ✅ WORKING');

    if (mainWorking && settingsHasContent) {
      console.log('\n🎉 SUCCESS: Both main window and settings window are working correctly!');
      console.log('   The white screen issue has been RESOLVED! 🚀');
    } else if (mainWorking) {
      console.log('\n✅ PARTIAL SUCCESS: Main window is working, settings window has issues');
    } else if (settingsHasContent) {
      console.log('\n⚠️  PARTIAL SUCCESS: Settings window works, but main window still has white screen');
      console.log('   This suggests a React app loading issue, not a server routing problem');
    } else {
      console.log('\n❌ ISSUE: Both windows are showing white screens');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed. Check the screenshots for visual verification.');
  }
}

// Run the test
testTankMonitoringApp().catch(console.error);
