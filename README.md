# Playwright Advertisement Screenshot Service

A cloud-ready service for periodically taking screenshots of advertisements on websites using Playwright.

# Donnie's Notes

밑애 쓴건 AI니까 딱히 안 일거도돼

Step 1. Install Dependencies: 
- press Terminal (cmd + `)
- write this code: npm install
- write this code: npm run install-browsers

Step 2. Choose Your Websites
- in files, click on config.json
- follow this format: 
  "websites": [
    {
      "name": "Korea Times",
      "url": "http://www.koreatimes.com",
      "selector": "body",
      "enabled": true
    },
    {
      "name": "World Journal",
      "url": "https://www.worldjournal.com/wj/cate/la",
      "selector": "body",
      "enabled": true
    },
    {
      "name": "Korea Daily",
      "url": "https://www.koreadaily.com",
      "selector": "body",
      "enabled": true
    } 
  ],
- 여기 보면, name 은 엄마가 원한 파일 내임이야. url 은 엄마가 원하는 website 으고

Step 3: Choosing Time Limit:
- in files, click on config.json
- Look at this format:
"settings": {
    "screenshotInterval": 60000,
    "screenshotDirectory": "./screenshots",
    "headless": true,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "waitUntil": "load",
    "navigationTimeout": 60000,
    "waitForSelector": null,
    "waitTime": 10000,
    "monitoringMode": {
      "enabled": true,
      "duration": 300000, 
      "screenshotInterval": 45000,
      "reloadPage": true,
      "reloadWaitTime": 5000,
      "strictComparison": false
    }
  }

- 엄마는 여기서 시간 죵료를 골르는거야. option 두가지 있여.
- If you want a time limit, then only change values under "MonitoringMode" (시간은 밀리초)
  - 중요한건 "enabled" true 이면, 타임리밋 스는거야 (duration)
- if you don't want a time limit, then "enabled": false
  - "settings" 밑애있는 "screenshot interval 서. 

Step 4: Start the Program
- go to terminal
- code: npm start

Step 5: Terminate
- go to terminal
- code: Ctrl + C

Step 6: Check Screenshots:
- it is in the screenshots folder





## Features

- 🎯 **Configurable Websites**: Choose which websites to monitor via `config.json`
- 📸 **Periodic Screenshots**: Automatically capture screenshots at specified intervals
- 🎨 **Element Selection**: Target specific elements (like ads) using CSS selectors
- 🌐 **Cross-Platform**: Works on Windows, Linux, and macOS
- ☁️ **Cloud-Ready**: Designed to run on cloud servers

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npm run install-browsers
   ```

## Configuration

Edit `config.json` to configure which websites to monitor:

```json
{
  "websites": [
    {
      "name": "My Website",
      "url": "https://example.com",
      "selector": "#advertisement",
      "enabled": true
    },
    {
      "name": "News Site",
      "url": "https://news-site.com",
      "selector": "#sidebar-ad, .ad-container",
      "enabled": true
    }
  ],
  "settings": {
    "screenshotInterval": 300000,
    "screenshotDirectory": "./screenshots",
    "headless": true,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "waitForSelector": null,
    "waitTime": 5000
  }
}
```

### Configuration Options

#### Websites Array
- `name`: Friendly name for the website (used in filenames)
- `url`: The website URL to screenshot
- `selector`: CSS selector for the specific element to capture (use `"body"` for full page, or target specific ads like `"#advertisement"`, `".ad-banner"`, `"#sidebar-ad"`)
- `enabled`: Set to `true` to enable monitoring for this website

**Targeting Subsections:**
- To capture only ads: `"selector": "#advertisement"` or `"selector": ".ad-container"`
- To capture sidebar: `"selector": "#sidebar"`
- To capture specific section: `"selector": "section[data-ad]"`
- Full page: `"selector": "body"` (default)

#### Settings
- `screenshotInterval`: Time between screenshots in milliseconds (default: 300000 = 5 minutes)
- `screenshotDirectory`: Directory where screenshots will be saved
- `headless`: Run browser in headless mode (true for servers, false for debugging)
- `viewport`: Browser viewport dimensions
- `waitForSelector`: Optional CSS selector to wait for before taking screenshot
- `waitTime`: Additional wait time in milliseconds after page load

## Usage

### Standard Mode (Periodic Screenshots)

1. **Configure your websites** in `config.json`
2. **Start the service:**
   ```bash
   npm start
   ```

The service will:
- Take an initial screenshot for each enabled website
- Continue taking screenshots at the specified interval
- Save screenshots with timestamps in the format: `website-name_YYYY-MM-DDTHH-MM-SS-sssZ.png`

### Monitoring Mode (Detect Ad Refresh Behavior)

Use monitoring mode to detect when ads actually change on a page. This keeps the page open and takes periodic screenshots to detect changes.

1. **Enable monitoring mode** in `config.json`:
   ```json
   "monitoringMode": {
     "enabled": true,
     "duration": 300000,
     "screenshotInterval": 15000
   }
   ```

2. **Start the service:**
   ```bash
   npm start
   ```

Monitoring mode will:
- Load the page once and keep it open
- Take screenshots every 15 seconds (configurable)
- Monitor for 5 minutes (configurable)
- Compare screenshots to detect changes
- Only save screenshots when changes are detected
- Report how often ads actually refresh

**Monitoring Mode Settings:**
- `enabled`: Set to `true` to enable monitoring mode
- `duration`: How long to monitor (in milliseconds). Default: 300000 (5 minutes)
- `screenshotInterval`: How often to take screenshots (in milliseconds). Default: 15000 (15 seconds)
- `reloadPage`: Set to `true` to reload the page before each screenshot (better for detecting ad refreshes). Default: `false` (keeps page open)
- `reloadWaitTime`: How long to wait after reload before taking screenshot (in milliseconds). Default: 3000 (3 seconds)
- `strictComparison`: Set to `true` to detect even tiny changes. Default: `false` (ignores minor rendering differences <1%)

**Reload Mode vs Keep-Open Mode:**
- **Reload Mode** (`reloadPage: true`): Reloads the page before each screenshot. Best for sites where ads only refresh on page reload (like news sites). Recommended interval: 30-60 seconds.
- **Keep-Open Mode** (`reloadPage: false`): Keeps the page open and monitors for dynamic changes. Best for sites with JavaScript-based ad rotation. Recommended interval: 15 seconds.

**Note:** All screenshots are saved regardless of whether changes are detected.

After monitoring, you'll see:
- Total screenshots taken
- Number of changes detected
- Average time between changes

Use this information to set the optimal `screenshotInterval` for standard mode!

## Example: Monitoring an Advertisement

To monitor a specific advertisement on a website:

```json
{
  "websites": [
    {
      "name": "News Site Ad",
      "url": "https://news-site.com",
      "selector": "#sidebar-ad",
      "enabled": true
    }
  ],
  "settings": {
    "screenshotInterval": 600000,
    "waitForSelector": "#sidebar-ad",
    "waitTime": 3000
  }
}
```

## Running on a Cloud Server

### Using PM2 (Recommended)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start the service:**
   ```bash
   pm2 start index.js --name ad-screenshot-service
   ```

3. **Make it start on boot:**
   ```bash
   pm2 startup
   pm2 save
   ```

### Using systemd

Create a service file at `/etc/systemd/system/ad-screenshot.service`:

```ini
[Unit]
Description=Playwright Ad Screenshot Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/node /path/to/project/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable ad-screenshot
sudo systemctl start ad-screenshot
```

## Finding CSS Selectors

To find the CSS selector for an advertisement:

1. Open the website in your browser
2. Right-click on the ad element
3. Select "Inspect" or "Inspect Element"
4. In the developer tools, right-click the HTML element
5. Select "Copy" → "Copy selector"
6. Paste it into the `selector` field in `config.json`

## Troubleshooting

### Screenshots are empty or black
- Increase `waitTime` to allow more time for content to load
- Set `waitForSelector` to wait for a specific element
- Try setting `headless: false` temporarily to see what's happening

### Selector not found
- Verify the selector is correct using browser dev tools
- The script will fall back to a full-page screenshot if the selector isn't found

### Browser installation issues
- Run `npm run install-browsers` again
- Check that you have sufficient disk space
- On Linux servers, you may need additional dependencies:
  ```bash
  sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
  ```

## License

MIT

