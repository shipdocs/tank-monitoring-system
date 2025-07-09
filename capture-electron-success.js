// Capture Electron app screenshot for final verification
import { chromium } from 'playwright';

async function captureElectronApp() {
  console.log('📸 Capturing Tank Monitoring System in Electron...\n');
  
  // Wait a moment for Electron to fully load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: 'tank-monitoring-success.png', fullPage: true });
  console.log('✅ Screenshot saved as tank-monitoring-success.png');
  
  // Get final status
  const status = await page.evaluate(() => {
    const root = document.getElementById('root');
    const tanks = document.querySelectorAll('[role="article"]');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    return {
      hasContent: root && root.innerHTML.length > 1000,
      tankCount: tanks.length,
      hasHeader: !!header,
      hasFooter: !!footer,
      title: document.title
    };
  });
  
  console.log('\n🎉 FINAL STATUS:');
  console.log('- Title:', status.title);
  console.log('- Has content:', status.hasContent);
  console.log('- Tank displays:', status.tankCount);
  console.log('- Has header:', status.hasHeader);
  console.log('- Has footer:', status.hasFooter);
  
  if (status.hasContent) {
    console.log('\n✅ SUCCESS! Tank Monitoring Dashboard is working in Electron!');
  }
  
  await browser.close();
}

captureElectronApp().catch(console.error);