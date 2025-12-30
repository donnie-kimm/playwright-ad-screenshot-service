import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
      }
    });

    const page = await context.newPage();
    
    console.log(`Navigating to: ${website.url}`);
    const waitUntil = settings.waitUntil || 'load'; // 'load' is more lenient than 'networkidle'
    const navigationTimeout = settings.navigationTimeout || 30000;
    
    await page.goto(website.url, { 
      waitUntil: waitUntil,
      timeout: navigationTimeout 
    });

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

