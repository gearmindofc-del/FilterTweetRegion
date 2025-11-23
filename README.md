# Filter Tweet Region

A Chrome extension that displays user regions on X/Twitter tweets and allows filtering tweets by country.

## Features

- 🌍 **Region Detection**: Automatically detects and displays the region of users mentioned in tweets
- 🎯 **Smart Filtering**: Filter your timeline to show only tweets from users in selected countries
- 🎨 **Beautiful UI**: Clean, modern interface with region badges and intuitive popup
- ⚡ **Real-time Updates**: Regions are fetched and displayed in real-time as you scroll
- 🔒 **Privacy First**: All requests use your existing Twitter session (no external API keys needed)

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the `FilterTweetRegion` folder
6. The extension is now installed!

## Usage

### Viewing Regions

1. Navigate to [X.com](https://x.com) or [Twitter.com](https://twitter.com)
2. The extension automatically detects mentions (`@username`) in tweets
3. Region badges appear below tweets showing the location of mentioned users
4. Badges show:
   - 📍 **Country name** - When region is detected
   - 📍 **Unknown** - When region is not available

### Filtering Tweets

1. Click the extension icon in your Chrome toolbar
2. Toggle "Enable Filter" to activate filtering
3. Use the two-column interface:
   - **Left column**: Available countries (not selected)
   - **Right column**: Selected countries (will be shown)
4. Select countries by checking boxes or using "Select All"
5. Use search boxes to quickly find countries
6. Tweets from users in selected countries will be visible; others will be hidden

## How It Works

### Architecture

The extension uses a three-layer architecture:

1. **Content Script** (`content.js`): Monitors the Twitter page, detects tweets, and extracts usernames
2. **Page Context Script** (`page_context.js`): Injected into the page context to access Twitter's internal tokens and cookies
3. **API Communication**: Uses `postMessage` to communicate between content script and page context

### Region Detection

- Extracts usernames from tweet mentions
- Makes authenticated requests to Twitter's GraphQL API
- Uses your existing session cookies and tokens
- Displays regions as badges below tweets

### Filtering Logic

- When filtering is enabled, tweets are shown only if:
  - At least one mentioned user has a region in the selected countries list
  - If no regions are detected, the tweet is hidden (when filter is active)

## Technical Details

### Files Structure

```
FilterTweetRegion/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js            # Content script (runs on Twitter pages)
├── api.js                # API communication layer
├── page_context.js       # Injected script (runs in page context)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── styles.css            # Styling for region badges
└── README.md            # This file
```

### Permissions

- `cookies`: To access Twitter session cookies
- `storage`: To save filter preferences
- `https://x.com/*` and `https://twitter.com/*`: To run on Twitter pages

### API Endpoint

The extension uses Twitter's internal GraphQL API:
```
GET https://x.com/i/api/graphql/XRqGa7EeokUU5kppkh13EA/AboutAccountQuery
```

This endpoint requires:
- Valid CSRF token (from cookies)
- Bearer token (extracted from page scripts)
- Session cookies (sent automatically)

## Privacy & Security

- ✅ No external API keys required
- ✅ Uses your existing Twitter session
- ✅ All data stays in your browser
- ✅ No data is sent to third-party servers
- ✅ Open source - you can review all code

## Troubleshooting

### Regions not showing?

1. Make sure you're logged into Twitter/X
2. Check the browser console (F12) for error messages
3. Try refreshing the page
4. Ensure the extension is enabled in `chrome://extensions/`

### Filter not working?

1. Make sure "Enable Filter" is toggled on
2. Verify you have selected at least one country
3. Check that tweets contain user mentions (`@username`)
4. Regions must be detected for filtering to work

### Rate limiting?

If you see "rate limit" messages:
- Twitter may be rate-limiting requests
- Wait a few minutes and try again
- The extension will automatically retry

## Development

### Building

No build process required - the extension uses vanilla JavaScript.

### Testing

1. Load the extension in developer mode
2. Open Twitter/X in a new tab
3. Check the browser console for logs (prefixed with `[FilterTweetRegion]`)
4. Test region detection and filtering functionality

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available for public use.

## Disclaimer

This extension is not affiliated with, endorsed by, or associated with Twitter/X. It is an independent tool created for educational and personal use.

## Credits

Created with ❤️ for the Twitter community.

