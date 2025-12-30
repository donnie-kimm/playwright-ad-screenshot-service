# Playwright Advertisement Screenshot Service

A cloud-ready service for periodically taking screenshots of advertisements on websites using Playwright.

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
- `selector`: CSS selector for the specific element to capture (use `"body"` or omit for full page)
- `enabled`: Set to `true` to enable monitoring for this website

#### Settings
- `screenshotInterval`: Time between screenshots in milliseconds (default: 300000 = 5 minutes)
- `screenshotDirectory`: Directory where screenshots will be saved
- `headless`: Run browser in headless mode (true for servers, false for debugging)
- `viewport`: Browser viewport dimensions
- `waitForSelector`: Optional CSS selector to wait for before taking screenshot
- `waitTime`: Additional wait time in milliseconds after page load

## Usage

1. **Configure your websites** in `config.json`
2. **Start the service:**
   ```bash
   npm start
   ```

The service will:
- Take an initial screenshot for each enabled website
- Continue taking screenshots at the specified interval
- Save screenshots with timestamps in the format: `website-name_YYYY-MM-DDTHH-MM-SS-sssZ.png`

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

