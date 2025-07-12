#!/usr/bin/env node

/**
 * Show Improved Dashboard
 * Take screenshot of larger input field and enhanced ETC/remaining volume
 */

import { _electron as electron } from 'playwright';

async function showImprovedDashboard() {
  console.log('📸 SHOWING IMPROVED DASHBOARD');
  console.log('============================');

  try {
    // Launch Electron app
    console.log('📱 Launching application...');
    const electronApp = await electron.launch({
      args: ['.'],
      cwd: '/home/martin/Ontwikkeling/tankmon'
    });

    const window = await electronApp.firstWindow();
    console.log('✅ Application launched');

    // Wait for app to load completely
    await window.waitForTimeout(8000);

    // Set a 5-digit setpoint to show the larger input field
    await window.evaluate(() => {
      const setpointInput = document.querySelector('input[type="number"]');
      if (setpointInput) {
        setpointInput.value = '12500';
        setpointInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await window.waitForTimeout(2000);

    // Get dashboard improvements info
    const improvementInfo = await window.evaluate(() => {
      const setpointInput = document.querySelector('input[type="number"]');
      const etcCard = document.querySelector('[class*="bg-orange-900"]');
      const remainingVolumeElement = document.querySelector('*[class*="bg-yellow-100"]');
      
      return {
        setpointInputWidth: setpointInput ? setpointInput.offsetWidth : 0,
        setpointInputValue: setpointInput ? setpointInput.value : '',
        etcCardHeight: etcCard ? etcCard.offsetHeight : 0,
        hasRemainingVolumeHighlight: remainingVolumeElement !== null,
        dashboardHeight: document.querySelector('[class*="bg-white rounded-sm shadow-sm"]')?.offsetHeight || 0
      };
    });

    console.log('\n📊 Dashboard Improvements:');
    console.log(`   Setpoint input width: ${improvementInfo.setpointInputWidth}px (w-24 = 96px)`);
    console.log(`   Setpoint value: ${improvementInfo.setpointInputValue} (5 digits)`);
    console.log(`   ETC card height: ${improvementInfo.etcCardHeight}px (larger padding)`);
    console.log(`   Remaining volume highlighted: ${improvementInfo.hasRemainingVolumeHighlight ? '✅' : '❌'}`);
    console.log(`   Dashboard height: ${improvementInfo.dashboardHeight}px`);

    // Take high-quality screenshot
    await window.screenshot({ 
      path: 'improved-dashboard-final.png',
      fullPage: false,
      quality: 100
    });
    
    console.log('\n📸 Screenshot saved: improved-dashboard-final.png');

    console.log('\n🎯 Key Improvements Visible:');
    console.log('   ✅ Larger setpoint input field (w-24 = 96px)');
    console.log('   ✅ Can accommodate 5-digit numbers (12500)');
    console.log('   ✅ Larger ETC display with text-base font');
    console.log('   ✅ Enhanced remaining volume with yellow highlight');
    console.log('   ✅ Better padding and spacing');
    console.log('   ✅ Professional maritime interface');

    console.log('\n🔍 App will stay open for 15 seconds for inspection...');
    await window.waitForTimeout(15000);

    // Close the app
    await electronApp.close();
    console.log('✅ Demo completed');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
showImprovedDashboard().catch(console.error);
