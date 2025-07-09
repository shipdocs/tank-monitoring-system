import { chromium } from 'playwright';

async function simpleTest() {
  console.log('🔍 Simple test of Tank Monitoring System...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to main page
    console.log('📱 Loading main page...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for React to potentially load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'simple-main-test.png', fullPage: true });
    
    // Get basic info
    const title = await page.title();
    const html = await page.content();
    const bodyText = await page.textContent('body');
    
    // Check for React root
    const rootElement = await page.$('#root');
    const rootContent = rootElement ? await rootElement.innerHTML() : 'No root element';
    
    // Check for any visible text
    const visibleText = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });
    
    console.log(`✅ Title: "${title}"`);
    console.log(`✅ HTML length: ${html.length} characters`);
    console.log(`✅ Body text length: ${bodyText?.length || 0} characters`);
    console.log(`✅ Root element exists: ${!!rootElement}`);
    console.log(`✅ Root content length: ${rootContent.length} characters`);
    console.log(`✅ Visible text length: ${visibleText.length} characters`);
    
    if (visibleText.length > 10) {
      console.log(`✅ Visible text preview: "${visibleText.substring(0, 100)}..."`);
    }
    
    if (rootContent.length > 10) {
      console.log(`✅ Root content preview: "${rootContent.substring(0, 200)}..."`);
    }
    
    // Test settings page
    console.log('\n⚙️ Loading settings page...');
    await page.goto('http://localhost:3001/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'simple-settings-test.png', fullPage: true });
    
    const settingsTitle = await page.title();
    const settingsText = await page.textContent('body');
    
    console.log(`✅ Settings title: "${settingsTitle}"`);
    console.log(`✅ Settings text length: ${settingsText?.length || 0} characters`);
    
    // Final assessment
    const mainWorking = visibleText.length > 50 || rootContent.length > 100;
    const settingsWorking = settingsText && settingsText.length > 100;
    
    console.log('\n📊 Results:');
    console.log(`   Main Window: ${mainWorking ? '✅ WORKING' : '❌ WHITE SCREEN'}`);
    console.log(`   Settings Window: ${settingsWorking ? '✅ WORKING' : '❌ WHITE SCREEN'}`);
    
    if (mainWorking && settingsWorking) {
      console.log('\n🎉 SUCCESS: Both windows are working! White screen issue RESOLVED! 🚀');
    } else if (settingsWorking && !mainWorking) {
      console.log('\n⚠️ PARTIAL: Settings works, main window still has issues');
      console.log('   This suggests the React app is not loading properly');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed. Check simple-main-test.png and simple-settings-test.png');
  }
}

simpleTest().catch(console.error);
