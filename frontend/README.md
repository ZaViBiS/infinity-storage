# Infinity Storage Frontend

A modern, responsive web frontend for the Infinity Storage project - an unlimited file storage solution using Telegram as the backend.

## ✨ Features

### 🚀 Core Functionality
- **File Upload & Download** - Drag-and-drop interface with progress tracking
- **API Key Management** - Secure generation and storage of API keys
- **File Management** - Browse, search, and organize your files
- **Real-time Updates** - Live progress indicators and status updates
- **Mobile Responsive** - Works perfectly on all device sizes

### 🎨 User Experience
- **Modern UI** - Clean, intuitive interface with smooth animations
- **Dark/Light Themes** - Toggle between light and dark modes
- **Keyboard Shortcuts** - Power user productivity features
- **Toast Notifications** - Non-intrusive feedback system
- **Progress Indicators** - Visual feedback for all operations

### 🔧 Technical Features
- **Vanilla JavaScript** - No heavy framework dependencies
- **ES6 Modules** - Modern, maintainable code structure
- **Responsive Design** - Mobile-first CSS with flexible layouts
- **Performance Optimized** - Efficient file handling and memory usage
- **Accessibility** - ARIA labels and keyboard navigation support

## 🚀 Quick Start

### Prerequisites
- A running Infinity Storage backend server
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Serve the frontend files** (any of these methods):

   **Option A: Python Simple Server**
   ```bash
   cd frontend
   python3 -m http.server 8000
   ```

   **Option B: Node.js HTTP Server**
   ```bash
   cd frontend
   npx http-server -p 8000
   ```

   **Option C: PHP Development Server**
   ```bash
   cd frontend
   php -S localhost:8000
   ```

   **Option D: Live Server Extension** (VS Code)
   - Install the "Live Server" extension
   - Right-click `index.html` and "Open with Live Server"

2. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

### First Time Setup

1. **Configure API Settings**
   - Click the Settings tab or press `Ctrl+,`
   - Enter your Infinity Storage server URL (default: `http://localhost:8081`)
   - Generate a new API key or enter an existing one
   - Click "Save Settings"

2. **Test Connection**
   - Click "Test Connection" to verify server connectivity
   - Check the server status indicator in the footer

3. **Start Using**
   - Upload files using drag-and-drop or click to browse
   - View and manage your files in the Files tab
   - Monitor upload progress in real-time

## 📖 Usage Guide

### Upload Files

**Method 1: Drag & Drop**
- Drag files directly onto the upload area
- Supports multiple files simultaneously

**Method 2: Click to Browse**
- Click the upload area or "Choose Files" button
- Select files from your device

**Upload Features:**
- Real-time progress tracking
- Queue management with concurrent uploads
- Automatic retry on failed uploads
- File size validation (max 2GB per file)

### Manage Files

**File Operations:**
- **Click file** - View details in modal
- **Download button** - Download file to device
- **Search** - Filter files by name
- **Grid/List View** - Toggle display modes

**File Information:**
- File name, size, and upload date
- Chunk count and status
- Direct download links

### Settings Configuration

**API Settings:**
- Server URL configuration
- API key generation and management
- Connection testing

**Theme Settings:**
- Light/Dark mode toggle
- Theme persistence across sessions

**Data Management:**
- Clear local storage data
- Reset to default settings

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Focus upload area |
| `Ctrl+F` | Focus search in files |
| `Ctrl+,` | Open settings |
| `Escape` | Close modal / Clear completed uploads |

## 🏗️ Project Structure

```
frontend/
├── index.html              # Main HTML file
├── css/
│   ├── main.css           # Base styles and layout
│   ├── components.css     # Component-specific styles
│   └── animations.css     # Animation definitions
├── js/
│   ├── main.js            # Application entry point
│   ├── api.js             # API communication layer
│   ├── auth.js            # Authentication and settings
│   ├── upload.js          # File upload management
│   ├── files.js           # File management interface
│   └── utils.js           # Utility functions and helpers
├── assets/
│   ├── icons/             # SVG icons
│   └── images/            # Static images
└── README.md              # This file
```

## 🔧 Configuration

### Default Settings
```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:8081',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
    CHUNK_SIZE: 20 * 1024 * 1024,         // 20MB
    TIMEOUT: 30000,                        // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000                      // 1 second
};
```

### Environment Variables
The frontend uses browser localStorage for configuration. Key settings include:
- `infinity_api_key` - Your API authentication key
- `infinity_server_url` - Backend server URL
- `infinity_theme` - Preferred theme (light/dark)

### Browser Compatibility

**Supported Browsers:**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Required Features:**
- ES6 Modules
- Fetch API
- File API
- LocalStorage
- CSS Grid & Flexbox

## 🎨 Customization

### Theming

The frontend uses CSS custom properties for easy theming:

```css
:root {
    --primary: #3B82F6;
    --secondary: #6B7280;
    --success: #10B981;
    --error: #EF4444;
    --background: #FFFFFF;
    --surface: #F9FAFB;
    --text-primary: #111827;
    /* ... more variables */
}
```

### Adding Custom Animations

Add new animations to `css/animations.css`:

```css
@keyframes yourAnimation {
    from { /* start state */ }
    to { /* end state */ }
}

.your-class {
    animation: yourAnimation 0.3s ease-in-out;
}
```

### Extending Functionality

**Adding New API Endpoints:**
1. Update `js/api.js` with new methods
2. Add UI components in relevant JS files
3. Update styling in CSS files

**Custom File Types:**
1. Update `FileUtils.getFileIcon()` in `js/api.js`
2. Add new icon styles in `css/components.css`

## 🐛 Troubleshooting

### Common Issues

**1. Connection Failed**
- Verify backend server is running
- Check server URL in settings
- Ensure CORS is configured on backend

**2. Upload Fails**
- Check file size (max 2GB)
- Verify API key is valid
- Check network connection

**3. Files Not Loading**
- Refresh the page
- Check API key authentication
- Verify server status

**4. Mobile Issues**
- Ensure responsive viewport meta tag
- Check touch events in mobile browser
- Verify CSS media queries

### Debug Mode

Enable debug logging in browser console:
```javascript
localStorage.setItem('infinity_debug', 'true');
```

### Performance Tips

1. **Large Files:** The frontend handles files up to 2GB with chunked uploads
2. **Many Files:** Upload queue manages up to 3 concurrent uploads
3. **Mobile Devices:** Limit concurrent uploads to 1 on slow connections

## 🔄 Updates

### Updating Frontend

1. Backup your current `frontend/` directory
2. Replace with new version
3. Copy any custom configurations
4. Clear browser cache if needed

### Version History

**v1.0.0** - Initial release
- File upload/download functionality
- API key management
- Responsive design
- Dark/light themes
- Keyboard shortcuts

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```
3. **Make changes** and test thoroughly
4. **Commit changes:**
   ```bash
   git commit -m "Add your feature"
   ```
5. **Push to branch:**
   ```bash
   git push origin feature/your-feature
   ```
6. **Submit Pull Request**

### Code Style

- Use ES6+ features
- Follow existing naming conventions
- Add comments for complex logic
- Test on multiple browsers
- Ensure mobile compatibility

## 📄 License

This frontend is part of the Infinity Storage project. See the main project license for details.

## 🆘 Support

- **Issues:** Report bugs via GitHub Issues
- **Features:** Request features via GitHub Discussions
- **Documentation:** Check the main project README

## 🔮 Future Enhancements

**Planned Features:**
- File sharing links
- Bulk operations (select multiple files)
- File preview (images, documents)
- Upload folders with directory structure
- File versioning
- Advanced search filters
- File metadata editing
- Export/import settings
- Progressive Web App (PWA) features
- Offline queue management

---

**Built with ❤️ using vanilla HTML, CSS, and JavaScript**