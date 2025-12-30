# CSS Selectors Reference Guide

This guide covers all the selector types you can use in the `selector` field of `config.json`.

## Basic CSS Selectors

### 1. **ID Selector** (Most Specific)
```json
"selector": "#advertisement"
```
- Selects element with `id="advertisement"`
- Example: `<div id="advertisement">...</div>`

### 2. **Class Selector**
```json
"selector": ".ad-banner"
```
- Selects elements with `class="ad-banner"`
- Example: `<div class="ad-banner">...</div>`

### 3. **Element/Tag Selector**
```json
"selector": "body"
"selector": "div"
"selector": "section"
```
- Selects all elements of that type
- `"body"` captures the entire page

### 4. **Attribute Selector**
```json
"selector": "[data-ad]"
"selector": "[data-ad='banner']"
"selector": "[id='advertisement']"
```
- Selects elements with specific attributes
- Useful for data attributes

### 5. **Descendant Selector**
```json
"selector": "#sidebar .ad"
"selector": "div.ad-container img"
```
- Selects elements nested inside other elements
- Space indicates descendant relationship

### 6. **Direct Child Selector**
```json
"selector": "#container > .ad"
```
- Selects direct children only (not nested deeper)

### 7. **Multiple Selectors (OR)**
```json
"selector": "#ad1, #ad2, .ad-banner"
```
- Selects any element matching any of the selectors
- Comma separates alternatives

### 8. **Pseudo-class Selectors**
```json
"selector": ".ad:first-child"
"selector": ".ad:last-child"
"selector": ".ad:nth-child(2)"
"selector": "a:hover"  // Note: hover state
```

### 9. **Combined Selectors**
```json
"selector": "div.ad-container#main-ad.banner"
```
- Combines multiple selectors (all must match)

## Advanced CSS Selectors

### 10. **Sibling Selectors**
```json
"selector": "#content + .ad"        // Adjacent sibling
"selector": "#content ~ .ad"        // General sibling
```

### 11. **Contains Text**
```json
"selector": "div:contains('Advertisement')"
```
- Note: This is Playwright-specific, not standard CSS

### 12. **Starts/Ends With**
```json
"selector": "[id^='ad-']"           // ID starts with "ad-"
"selector": "[class$='-banner']"    // Class ends with "-banner"
"selector": "[href*='ad']"          // Contains "ad"
```

## Playwright-Specific Selectors

Playwright supports additional powerful selectors beyond standard CSS:

### 13. **Text Selector**
```json
"selector": "text=Advertisement"
"selector": "text=/Ad.*Banner/i"
```
- Matches elements containing specific text
- Supports regex with `/pattern/flags`

### 14. **Role Selector** (Accessibility)
```json
"selector": "role=banner"
"selector": "role=button[name='Close Ad']"
```
- Uses ARIA roles for more semantic selection

### 15. **XPath Selector**
```json
"selector": "xpath=//div[@id='advertisement']"
"selector": "xpath=//div[contains(@class, 'ad')]"
```
- Powerful but more complex
- Useful for complex DOM navigation

### 16. **Nth Match**
```json
"selector": ".ad >> nth=0"           // First match
"selector": ".ad >> nth=1"          // Second match
"selector": ".ad >> nth=-1"         // Last match
```

### 17. **Has Text**
```json
"selector": ".ad:has-text('Click here')"
```
- Selects element containing specific text

### 18. **Visible Selector**
```json
"selector": ".ad:visible"
```
- Only matches visible elements

## Common Advertisement Selector Patterns

### Google AdSense
```json
"selector": "#google_ads_iframe"
"selector": ".adsbygoogle"
"selector": "[id^='google_ads_iframe']"
```

### Generic Ad Containers
```json
"selector": ".ad-container"
"selector": "#ad-banner"
"selector": "[data-ad-slot]"
"selector": ".advertisement"
"selector": "#sidebar-ad"
"selector": ".sponsored-content"
```

### Iframe Ads
```json
"selector": "iframe[src*='ads']"
"selector": "iframe.ad-frame"
```

## Finding the Right Selector

### Method 1: Browser DevTools
1. Right-click the element → "Inspect"
2. Right-click the HTML element → "Copy" → "Copy selector"
3. Paste into config.json

### Method 2: Playwright Inspector
Run with `headless: false` and use browser dev tools to test selectors

### Method 3: Test Selectors
You can test selectors by temporarily modifying the script to log what it finds.

## Examples for Your Use Case

### Ultimate Guitar Tabs Site
Based on your current URL, here are some potential selectors:

```json
// If there's a specific ad container
"selector": "#advertisement"

// If ads are in a sidebar
"selector": "#sidebar .ad, .sidebar-ad"

// If ads are in a specific section
"selector": "section[data-ad]"

// If you want the entire page
"selector": "body"

// If you want just the main content area
"selector": "#content, .main-content"

// If ads are in iframes
"selector": "iframe[src*='ad']"
```

## Best Practices

1. **Be Specific**: Use IDs when possible (`#advertisement` is better than `.ad`)
2. **Test First**: Try selectors in browser console: `document.querySelector('your-selector')`
3. **Fallback**: The script automatically falls back to full-page screenshot if selector not found
4. **Multiple Elements**: If selector matches multiple elements, the first one is used
5. **Wait for Load**: Use `waitForSelector` in settings if ads load dynamically

## Troubleshooting

- **Selector not found**: Check in browser dev tools if element exists
- **Wrong element**: Make selector more specific
- **Timing issues**: Increase `waitTime` or set `waitForSelector` in settings
- **Dynamic content**: Use `waitForSelector` to wait for ad to appear

