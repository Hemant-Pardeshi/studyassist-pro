# StudyAssist Pro - Chrome Extension

A comprehensive Chrome extension designed to help students study more effectively by providing text highlighting, word definitions, and note-taking capabilities on any webpage.

## 🚀 Quick Start

### Installation
1. Download the latest release from [Releases](../../releases)
2. Extract the ZIP file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extracted folder

### Usage
- **📝 Highlight text**: Select any text with your mouse
- **📖 Get definitions**: Double-click on any word
- **⌨️ Keyboard shortcut**: Select text and press `Ctrl+D` (or `Cmd+D` on Mac)
- **🗑️ Remove highlights**: Click on highlighted text

## Features

### 🎨 Text Highlighting
- **Easy Selection**: Simply select any text on a webpage to highlight it
- **Multiple Colors**: Choose from 5 different highlight colors (yellow, green, blue, orange, pink)
- **Persistent Storage**: Highlights are saved per domain and persist across browser sessions
- **Right-click to Remove**: Context menu option to remove individual highlights
- **Visual Feedback**: Smooth animations and hover effects

### 📖 Word Definitions
- **Double-click Lookup**: Double-click any word to get its definition
- **Smart Positioning**: Tooltips appear right next to the clicked word
- **Comprehensive Information**: Shows word pronunciation, part of speech, definition, examples, and synonyms
- **Free Dictionary API**: Uses a reliable free dictionary service
- **Beautiful Tooltips**: Clean, modern tooltip design with easy-to-read formatting
- **Quick Access**: Instant lookup without leaving the page

### 📝 Note Taking
- **Floating Panel**: Resizable, draggable notes panel that stays on top
- **Per-domain Storage**: Notes are saved separately for each website
- **Rich Features**: Add, edit, and delete notes with timestamps
- **Minimize/Maximize**: Collapsible panel to save screen space
- **Keyboard Shortcuts**: Use Ctrl+Enter (Cmd+Enter on Mac) to quickly add notes
- **Context Integration**: Right-click selected text to add it as a note

### ⚙️ Smart Controls
- **Extension Popup**: Easy toggle controls for all features
- **Statistics**: See count of highlights and notes per page
- **Color Picker**: Visual color selection for highlights
- **Clear All**: Quick option to clear all data for current domain
- **Persistent Settings**: Your preferences are saved across sessions

## Installation

### Option 1: Load as Unpacked Extension (Development)

1. **Download the Extension**:
   - Clone or download this repository
   - Extract to a folder on your computer

2. **Open Chrome Extensions**:
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**:
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

4. **Pin the Extension**:
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Student Study Helper" and click the pin icon
   - The extension icon will now appear in your toolbar

### Option 2: Package and Install

1. **Package the Extension**:
   - In Chrome extensions page, click "Pack extension"
   - Select the extension folder
   - This creates a `.crx` file

2. **Install the Package**:
   - Drag the `.crx` file to the Chrome extensions page
   - Confirm the installation

## Usage Guide

### Getting Started

1. **Enable Features**: Click the extension icon and toggle on the features you want to use
2. **Choose Highlight Color**: Select your preferred highlight color from the color palette
3. **Start Studying**: Navigate to any webpage and begin using the features

### Highlighting Text

1. **Select Text**: Use your mouse to select any text on the page
2. **Auto-highlight**: The selected text will automatically be highlighted
3. **Change Colors**: Use the popup to change highlight colors
4. **Remove Highlights**: Right-click highlighted text and select "Remove highlight"

### Looking Up Words

1. **Double-click**: Double-click any word to see its definition
2. **View Details**: A tooltip will show pronunciation, meaning, examples, and synonyms
3. **Close Tooltip**: Click the X button or click anywhere outside the tooltip

### Taking Notes

1. **Open Notes Panel**: Toggle on "Show notes panel" in the extension popup
2. **Add Notes**: Type in the text area and click "Add Note" or press Ctrl+Enter
3. **Manage Notes**: View all notes with timestamps, delete unwanted notes
4. **Minimize Panel**: Click the minimize button (-) to collapse the panel
5. **Move Panel**: Drag the panel header to reposition it on the page

### Advanced Features

- **Context Menu**: Right-click selected text for additional options
- **Per-domain Storage**: Your highlights and notes are organized by website
- **Data Management**: Use "Clear All Data" to remove all highlights and notes for current site
- **Responsive Design**: Works on both desktop and mobile layouts

## Technical Details

### Architecture
- **Manifest V3**: Built with the latest Chrome extension standards
- **Content Scripts**: Injected into all web pages for functionality
- **Background Service Worker**: Handles API calls and data management
- **Chrome Storage API**: Reliable data persistence across sessions

### Permissions
- `activeTab`: Access to current tab for content injection
- `storage`: Save highlights, notes, and settings
- `contextMenus`: Right-click menu options
- `<all_urls>`: Work on any website

### APIs Used
- **Dictionary API**: Free English dictionary service (dictionaryapi.dev)
- **Chrome Storage**: Sync and local storage for data persistence
- **Chrome Runtime**: Message passing between components

### File Structure
```
chrome-plugin/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── content.js             # Main content script
├── background.js          # Service worker
├── styles.css             # Extension styles
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Customization

### Adding New Highlight Colors
Edit the `popup.html` file and add new color options to the color palette:

```html
<div class="color-option" style="background-color: #your-color;" data-color="#your-color"></div>
```

### Modifying Styles
Edit `styles.css` to customize the appearance of highlights, tooltips, and the notes panel.

### Extending Functionality
The modular structure makes it easy to add new features:
- Add new message handlers in `content.js`
- Extend the background script for new API integrations
- Modify the popup for additional controls

## Privacy & Data

- **Local Storage**: All data is stored locally in your browser
- **No Tracking**: The extension doesn't collect or transmit personal data
- **API Usage**: Only dictionary lookups are sent to external APIs
- **Per-domain**: Data is organized by website domain for privacy

## Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support)
- **Edge**: Version 88+ (Chromium-based)
- **Opera**: Version 74+ (Chromium-based)
- **Brave**: Version 1.20+ (Chromium-based)

## Troubleshooting

### Extension Not Working
1. Check if the extension is enabled in `chrome://extensions/`
2. Refresh the webpage after enabling the extension
3. Check browser console for error messages

### Highlights Not Saving
1. Ensure the extension has storage permissions
2. Check if you're in incognito mode (may affect storage)
3. Clear browser cache and reload

### Definitions Not Loading
1. Check your internet connection
2. The dictionary API may be temporarily unavailable
3. Try refreshing the page

### Notes Panel Missing
1. Enable "Show notes panel" in the extension popup
2. The panel may be positioned off-screen - try resetting by disabling and re-enabling

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Setup
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Make changes and reload extension for testing
4. Follow Chrome extension development best practices

## 🛠️ Development

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/studyassist-pro.git
cd studyassist-pro

# Install dependencies
npm install

# Run linting
npm run lint

# Build extension
npm run build

# Create package
npm run zip
```

### GitHub Actions

This project uses GitHub Actions for CI/CD:

#### 🔄 **CI/CD Pipeline** (`.github/workflows/ci.yml`)
- **Triggers**: Push to main/develop, Pull requests
- **Actions**: Lint code, validate manifest, run tests, security scan

#### 📦 **Build & Package** (`.github/workflows/build.yml`)
- **Triggers**: Push to main, version tags
- **Actions**: Create production builds, minify files, generate packages

#### 🚀 **Release** (`.github/workflows/release.yml`)
- **Triggers**: Version tags (v1.0.0, v1.0.1, etc.)
- **Actions**: Create GitHub releases, generate changelogs, prepare store assets

### Creating a Release

1. **Update version** in `manifest.json`
2. **Commit changes**: `git commit -am "Release v1.0.1"`
3. **Create tag**: `git tag v1.0.1`
4. **Push tag**: `git push origin v1.0.1`
5. **GitHub Actions** will automatically create the release

### Local Testing

Use the included `test.html` file to test all functionality:
```bash
# Open test file in browser with extension loaded
open test.html
```

### Code Structure
```
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── styles.css            # Extension styles
├── popup.html/js         # Extension popup
├── icons/                # Extension icons
├── .github/workflows/    # GitHub Actions
├── scripts/              # Build scripts
└── test.html            # Testing page
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have suggestions:
1. Check the troubleshooting section
2. Search existing issues on GitHub
3. Create a new issue with detailed description

## Changelog

### Version 1.0
- Initial release
- Text highlighting with multiple colors
- Word definitions with double-click
- Smart tooltip positioning
- Floating notes panel
- Per-domain data storage
- Context menu integration
- Responsive design
- GitHub Actions CI/CD

---

**Happy Studying! 📚✨**
