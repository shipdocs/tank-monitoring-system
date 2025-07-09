// Test IIFE build in browser
import { chromium } from 'playwright';

async function testIIFE() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('Page error:', err));

  await page.goto('http://localhost:3001');

  // Wait a bit for React to load
  await page.waitForTimeout(2000);

  // Check what's in the page
  const debugInfo = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      rootExists: !!root,
      rootContent: root ? root.innerHTML : 'no root',
      scripts: Array.from(document.scripts).map(s => ({ src: s.src, type: s.type })),
      hasReact: !!(window.React || window.ReactDOM),
      windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('react')),
      errors: window.__errors || [],
    };
  });

  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

  // Keep browser open for inspection
  await page.waitForTimeout(10000);

  await browser.close();
}

testIIFE().catch(console.error);
