import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
function loadConfig() {
  try {
    const configPath = join(__dirname, 'config.json');
    const configData = readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading config.json:', error.message);
    process.exit(1);
  }
}

// Ensure screenshot directory exists
function ensureScreenshotDir(directory) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
    console.log(`Created screenshot directory: ${directory}`);
  }
}

// Calculate hash of a screenshot file for comparison
function getScreenshotHash(filepath) {
  try {
    const fileBuffer = readFileSync(filepath);
    return createHash('md5').update(fileBuffer).digest('hex');
  } catch (error) {
    return null;
  }
}

// Compare two screenshots and return if they're different
function compareScreenshots(filepath1, filepath2) {
  const hash1 = getScreenshotHash(filepath1);
  const hash2 = getScreenshotHash(filepath2);
  
  if (!hash1 || !hash2) {
    return { different: true, reason: 'Could not read one or both files' };
  }
  
  return {
    different: hash1 !== hash2,
    hash1,
    hash2
  };
}

// Take screenshot of a website
async function takeScreenshot(website, settings) {
  const browser = await chromium.launch({ 
    headless: settings.headless 
  });
  
  try {
    const context = await browser.newContext({
      viewport: {
        width: settings.viewport.width,
        height: settings.viewport.height
      },
      // Disable caching to ensure fresh content on each screenshot
      ignoreHTTPSErrors: true
    });
    
    // Disable cache for this context
    await context.addInitScript(() => {
      // Clear cache before navigation
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    });

    const page = await context.newPage();
    
    // Disable cache for this page
    await page.route('**/*', (route) => {
      route.continue({
        headers: {
          ...route.request().headers(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    });
    
    // Add cache-busting parameter to URL to force fresh load
    const url = new URL(website.url);
    url.searchParams.set('_t', Date.now().toString());
    const cacheBustedUrl = url.toString();
    
    console.log(`Navigating to: ${website.url} (cache-busted)`);
    const waitUntil = settings.waitUntil || 'load'; // 'load' is more lenient than 'networkidle'
    const navigationTimeout = settings.navigationTimeout || 60000;
    
    try {
      await page.goto(cacheBustedUrl, { 
        waitUntil: waitUntil,
        timeout: navigationTimeout 
      });
    } catch (error) {
      // If 'load' times out, try with 'domcontentloaded' as fallback
      if (error.message.includes('Timeout') && waitUntil === 'load') {
        console.warn(`Page load timed out, trying with 'domcontentloaded' instead...`);
        await page.goto(cacheBustedUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeout 
        });
      } else {
        throw error;
      }
    }

    // Wait for additional time if specified
    if (settings.waitTime > 0) {
      await page.waitForTimeout(settings.waitTime);
    }

    // Wait for specific selector if provided
    if (settings.waitForSelector) {
      try {
        await page.waitForSelector(settings.waitForSelector, { timeout: 10000 });
        console.log(`Found selector: ${settings.waitForSelector}`);
      } catch (error) {
        console.warn(`Selector ${settings.waitForSelector} not found, continuing anyway...`);
      }
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = website.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeName}_${timestamp}.png`;
    const filepath = join(settings.screenshotDirectory, filename);

    // Take screenshot of specific element or full page
    if (website.selector && website.selector !== 'body') {
      try {
        // Wait a bit for the element to potentially appear
        await page.waitForTimeout(1000);
        const element = page.locator(website.selector).first();
        const count = await element.count();
        
        if (count === 0) {
          console.warn(`Selector ${website.selector} not found on page, taking full page screenshot instead`);
          await page.screenshot({ path: filepath, fullPage: true });
          console.log(`Screenshot saved: ${filepath} (full page - selector not found)`);
        } else {
          await element.screenshot({ path: filepath });
          console.log(`Screenshot saved: ${filepath} (element: ${website.selector})`);
        }
      } catch (error) {
        console.warn(`Error with selector ${website.selector}: ${error.message}, taking full page screenshot instead`);
        await page.screenshot({ path: filepath, fullPage: true });
        console.log(`Screenshot saved: ${filepath} (full page - fallback)`);
      }
    } else {
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`Screenshot saved: ${filepath} (full page)`);
    }

    await browser.close();
    return filepath;
  } catch (error) {
    console.error(`Error taking screenshot for ${website.name}:`, error.message);
    await browser.close();
    throw error;
  }
}

// Monitor a page by keeping it open and taking periodic screenshots
async function monitorPageForChanges(website, settings, monitoringSettings) {
  const browser = await chromium.launch({ 
    headless: settings.headless 
  });
  
  try {
    const context = await browser.newContext({
      viewport: {
        width: settings.viewport.width,
        height: settings.viewport.height
      },
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    
    console.log(`\n[${website.name}] Starting page monitoring...`);
    console.log(`  URL: ${website.url}`);
    console.log(`  Monitoring duration: ${monitoringSettings.duration / 1000} seconds`);
    console.log(`  Screenshot interval: ${monitoringSettings.screenshotInterval / 1000} seconds`);
    if (monitoringSettings.reloadPage) {
      console.log(`  Mode: Reload page before each screenshot (better for ad refresh detection)`);
    } else {
      console.log(`  Mode: Keep page open (monitor dynamic changes)`);
    }
    if (website.selector && website.selector !== 'body') {
      console.log(`  Targeting element: ${website.selector}`);
    } else {
      console.log(`  Targeting: Full page (use "selector" to target specific element)`);
    }
    
    // Navigate to the page
    const waitUntil = settings.waitUntil || 'load';
    const navigationTimeout = settings.navigationTimeout || 60000;
    
    try {
      await page.goto(website.url, { 
        waitUntil: waitUntil,
        timeout: navigationTimeout 
      });
    } catch (error) {
      if (error.message.includes('Timeout') && waitUntil === 'load') {
        console.warn(`  Page load timed out, trying with 'domcontentloaded' instead...`);
        await page.goto(website.url, { 
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeout 
        });
      } else {
        throw error;
      }
    }

    // Wait for initial content to load
    if (settings.waitTime > 0) {
      await page.waitForTimeout(settings.waitTime);
    }

    if (settings.waitForSelector) {
      try {
        await page.waitForSelector(settings.waitForSelector, { timeout: 10000 });
        console.log(`  Found selector: ${settings.waitForSelector}`);
      } catch (error) {
        console.warn(`  Selector ${settings.waitForSelector} not found, continuing anyway...`);
      }
    }

    // Helper function to take screenshot of target element
    const takeTargetedScreenshot = async (filepath) => {
      if (website.selector && website.selector !== 'body') {
        try {
          // Wait a moment for element to be stable
          await page.waitForTimeout(500);
          const element = page.locator(website.selector).first();
          const count = await element.count();
          if (count > 0) {
            await element.screenshot({ path: filepath });
            return true;
          } else {
            console.warn(`  ⚠️  Selector "${website.selector}" not found, using full page`);
            await page.screenshot({ path: filepath, fullPage: true });
            return false;
          }
        } catch (error) {
          console.warn(`  ⚠️  Error with selector "${website.selector}": ${error.message}, using full page`);
          await page.screenshot({ path: filepath, fullPage: true });
          return false;
        }
      } else {
        await page.screenshot({ path: filepath, fullPage: true });
        return true;
      }
    };

    // Take initial screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = website.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const initialFilename = `${safeName}_monitor_initial_${timestamp}.png`;
    const initialFilepath = join(settings.screenshotDirectory, initialFilename);
    
    await takeTargetedScreenshot(initialFilepath);
    console.log(`  Initial screenshot: ${initialFilepath}`);
    let previousFilepath = initialFilepath;
    let screenshotCount = 0;
    let changeCount = 0;
    const startTime = Date.now();
    const endTime = startTime + monitoringSettings.duration;

    // Helper function to reload page and wait
    const reloadAndWait = async () => {
      if (monitoringSettings.reloadPage) {
        console.log(`    Reloading page...`);
        try {
          await page.reload({ 
            waitUntil: waitUntil,
            timeout: navigationTimeout 
          });
          
          // Wait for content to load after reload
          const reloadWaitTime = monitoringSettings.reloadWaitTime || 3000;
          await page.waitForTimeout(reloadWaitTime);
          
          // Wait for selector if specified
          if (settings.waitForSelector) {
            try {
              await page.waitForSelector(settings.waitForSelector, { timeout: 5000 });
            } catch (e) {
              // Ignore if selector not found
            }
          }
        } catch (error) {
          console.warn(`    Reload warning: ${error.message}`);
        }
      }
    };

    // Monitor and take periodic screenshots
    while (Date.now() < endTime) {
      await page.waitForTimeout(monitoringSettings.screenshotInterval);
      
      if (Date.now() >= endTime) break;
      
      screenshotCount++;
      const currentTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentFilename = `${safeName}_monitor_${screenshotCount}_${currentTimestamp}.png`;
      const currentFilepath = join(settings.screenshotDirectory, currentFilename);
      
      // Take screenshot
      try {
        // Reload page if reload mode is enabled
        await reloadAndWait();
        
        await takeTargetedScreenshot(currentFilepath);
        
        // Compare with previous screenshot (for informational purposes only)
        const comparison = compareScreenshots(previousFilepath, currentFilepath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Always save screenshots, but log if there's a change
        if (comparison.different) {
          changeCount++;
          console.log(`  [${elapsed}s] Screenshot #${screenshotCount}: CHANGE DETECTED! ✨ | Saved: ${currentFilepath}`);
          previousFilepath = currentFilepath;
        } else {
          console.log(`  [${elapsed}s] Screenshot #${screenshotCount}: No change (identical) | Saved: ${currentFilepath}`);
          previousFilepath = currentFilepath;
        }
      } catch (error) {
        console.error(`  Error taking screenshot #${screenshotCount}:`, error.message);
      }
    }

    await browser.close();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[${website.name}] Monitoring complete!`);
    console.log(`  Total time: ${totalTime} seconds`);
    console.log(`  Screenshots taken: ${screenshotCount}`);
    console.log(`  Changes detected: ${changeCount}`);
    console.log(`  Change rate: ${changeCount > 0 ? (totalTime / changeCount).toFixed(1) : 'N/A'} seconds per change`);
    
    return {
      totalTime,
      screenshotsTaken: screenshotCount,
      changesDetected: changeCount
    };
  } catch (error) {
    console.error(`Error monitoring ${website.name}:`, error.message);
    await browser.close();
    throw error;
  }
}

// Main function to run periodic screenshots
async function runScreenshotService() {
  const config = loadConfig();
  const { websites, settings } = config;

  // Ensure screenshot directory exists
  ensureScreenshotDir(settings.screenshotDirectory);

  // Filter enabled websites
  const enabledWebsites = websites.filter(site => site.enabled);
  
  if (enabledWebsites.length === 0) {
    console.log('No enabled websites found in config.json. Please enable at least one website.');
    console.log('Edit config.json and set "enabled": true for the websites you want to monitor.');
    return;
  }

  // Check if monitoring mode is enabled
  if (settings.monitoringMode && settings.monitoringMode.enabled) {
    console.log('='.repeat(60));
    console.log('MONITORING MODE: Detecting ad refresh behavior');
    console.log('='.repeat(60));
    
    for (const website of enabledWebsites) {
      try {
        await monitorPageForChanges(website, settings, settings.monitoringMode);
      } catch (error) {
        console.error(`Failed to monitor ${website.name}:`, error.message);
      }
    }
    
    console.log('\nMonitoring complete. Check the results above to determine optimal screenshot interval.');
    process.exit(0);
    return;
  }

  console.log(`Starting screenshot service for ${enabledWebsites.length} website(s)`);
  console.log(`Screenshot interval: ${settings.screenshotInterval / 1000} seconds`);
  console.log(`Screenshot directory: ${settings.screenshotDirectory}`);
  console.log(`Next screenshot in: ${settings.screenshotInterval / 1000} seconds`);
  console.log('---');

  // Take initial screenshots
  for (const website of enabledWebsites) {
    try {
      await takeScreenshot(website, settings);
    } catch (error) {
      console.error(`Failed to take screenshot for ${website.name}:`, error.message);
    }
  }

  // Set up periodic screenshots
  let screenshotCount = 0;
  const intervalId = setInterval(async () => {
    screenshotCount++;
    console.log(`\n[${new Date().toISOString()}] Taking periodic screenshots (iteration #${screenshotCount})...`);
    for (const website of enabledWebsites) {
      try {
        const filepath = await takeScreenshot(website, settings);
        console.log(`✓ Successfully captured screenshot: ${filepath}`);
      } catch (error) {
        console.error(`✗ Failed to take screenshot for ${website.name}:`, error.message);
        console.error('Error stack:', error.stack);
      }
    }
    console.log(`Next screenshot in ${settings.screenshotInterval / 1000} seconds...`);
  }, settings.screenshotInterval);

  // Handle unhandled promise rejections in interval
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down screenshot service...');
    clearInterval(intervalId);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down screenshot service...');
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Run the service
runScreenshotService().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

