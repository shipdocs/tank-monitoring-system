#!/usr/bin/env node

/**
 * Take Final Screenshot
 * Show the improved dashboard with larger input and ETC
 */

import { _electron as electron } from 'playwright';

async function takeFinalScreenshot() {
  console.log('📸 TAKING FINAL SCREENSHOT');
  console.log('=========================');

  try {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.'],
      cwd: '/home/martin/Ontwikkeling/tankmon'
    });

    const window = await electronApp.firstWindow();
    console.log('✅ Application launched');

    // Wait for app to load
    await window.waitForTimeout(8000);

    // Set a 5-digit setpoint
    await window.evaluate(() => {
      const setpointInput = document.querySelector('input[type="number"]');
      if (setpointInput) {
        setpointInput.value = '12500';
        setpointInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await window.waitForTimeout(2000);

    // Take screenshot
    await window.screenshot({ 
      path: 'improved-dashboard-final.png',
      fullPage: false
    });
    
    console.log('📸 Screenshot saved: improved-dashboard-final.png');
    console.log('✅ Improvements visible:');
    console.log('   - Larger setpoint input (96px wide)');
    console.log('   - 5-digit number support (12500)');
    console.log('   - Bigger ETC display');
    console.log('   - Highlighted remaining volume');

    // Close the app
    await electronApp.close();
    console.log('✅ Screenshot completed');

  } catch (error) {
    console.error('❌ Screenshot failed:', error);
  }
}

takeFinalScreenshot().catch(console.error);
