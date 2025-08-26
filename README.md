# Calendar Planner - Progressive Web App

A modern, responsive calendar planning application built with vanilla JavaScript ES6 modules and modular CSS. Features full PWA capabilities for offline use and native app-like experience.

## 🚀 Features

### Core Calendar Functionality
- **📅 Interactive Calendar**: Year-based calendar view with intuitive navigation and today highlighting
- **🎨 Event Categories**: Full CRUD operations with custom colors and drag-and-drop reordering using SortableJS
- **📄 Text Import**: Intelligent parsing of schedule text to automatically extract events and categories
- **📊 Statistics Dashboard**: Real-time category statistics with visual indicators and usage insights

### Enhanced User Experience  
- **😊 Comprehensive Emoji System**: 10+ organized emoji categories (Smileys, People, Work, Travel, etc.) with smart suggestions
- **🌙 Dual Themes**: Light and midnight themes with smooth transitions and adaptive interface
- **📱 Mobile Optimized**: Touch-friendly interface with enhanced gesture support and responsive design
- **🎯 Help System**: Interactive walkthrough and comprehensive help documentation
- **♿ Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support

### Progressive Web App (PWA)
- **📱 Install to Device**: Works as native app on all platforms (iOS, Android, Desktop)
- **⚡ Offline Functionality**: Full feature access with service worker caching when disconnected
- **🚀 PWA Shortcuts**: Quick access to Add Category, View Today, Manage, and Import features
- **🔄 Background Sync**: Seamless data persistence and updates

### Privacy & Performance
- **🔒 Privacy-First**: 100% local storage - no data leaves your device, no tracking or external APIs
- **⚡ Cross-Platform Emoji**: Enhanced emoji rendering with automatic fallbacks for compatibility
- **🎯 Performance**: Efficient rendering with minimal DOM manipulation and optimized loading

## 📁 Project Structure

```
calendar-planner/
├── index.html              # Main HTML entry point
├── manifest.json          # PWA manifest for app installation
├── sw.js                  # Service worker for offline functionality
├── package.json           # Project configuration and scripts
├── LICENSE                # MIT license
├── PROJECT_STRUCTURE.md   # Detailed architecture documentation
├── 
├── css/                   # Modular CSS architecture
│   ├── README.md         # CSS architecture documentation
│   ├── variables.css     # CSS custom properties and design tokens
│   ├── base.css         # Global styles, resets, and typography
│   ├── layout.css       # Grid layouts and structural components
│   ├── components.css   # Reusable UI components and interactions
│   ├── modals.css       # Modal dialogs and form styles
│   ├── themes.css       # Theme system (light/midnight)
│   └── responsive.css   # Mobile-first responsive breakpoints
├── 
├── js/                   # JavaScript modules
│   ├── config/          # Configuration and constants
│   │   └── constants.js # App constants and configuration
│   ├── core/            # Core functionality
│   │   └── state.js     # Centralized state management
│   ├── utils/           # Utility functions
│   │   └── dom.js       # DOM manipulation helpers
│   └── modules/         # Main application modules
│       ├── app.js       # Application entry point and initialization
│       ├── constants.js # Legacy re-exports (backward compatible)
│       ├── store.js     # LocalStorage data persistence layer
│       ├── ui.js        # DOM manipulation and rendering engine
│       ├── events.js    # Event handlers and user interactions
│       ├── logic.js     # Business logic and data processing
│       └── utils.js     # Date utilities and helper functions
├── 
└── assets/              # Static assets and resources
    ├── fonts/          # Custom font files (Onest)
    ├── icons/          # App icons and favicon
    └── js/vendor/      # Third-party libraries (SortableJS)
```

## 🛠️ Architecture Overview

### CSS Modules
- **variables.css**: CSS custom properties for theming and design tokens
- **base.css**: Global resets, typography, and base styles
- **layout.css**: Grid layouts, containers, and structural components
- **components.css**: Reusable UI components and interactive elements
- **modals.css**: Modal dialogs, forms, and overlay components
- **themes.css**: Theme-specific overrides and color schemes
- **responsive.css**: Mobile-first responsive design breakpoints

### JavaScript Modules

#### Core Structure
- **js/config/constants.js**: Application constants, configuration, and static values
- **js/core/state.js**: Centralized state management with controlled access
- **js/utils/dom.js**: DOM manipulation utilities and selector helpers

#### Application Modules  
- **app.js**: Entry point, initialization, and module coordination
- **store.js**: Data persistence layer with localStorage integration
- **ui.js**: DOM manipulation, rendering, and UI state management
- **events.js**: Event listeners, user interactions, and form handling
- **logic.js**: Business logic, calculations, and data processing
- **utils.js**: Date utility functions, validation, and helper functions

## 🚦 Getting Started

### 🌐 Live Demo
Visit the live application: **[Calendar Planner](https://kotapullarao.github.io/calendar-planner)**

### 📱 Installation
1. **Web Browser**: Open the link above
2. **Install as App**: Look for "Install" or "Add to Home Screen" prompt
3. **Offline Use**: Works offline after first visit

### 🎯 Quick Start
1. **Create Categories**: Click "Manage Plan" → "Add New" to create event categories with custom emojis and colors
2. **Import Events**: Use "Import" to bulk-add events from text/schedules with intelligent parsing
3. **Navigate Calendar**: Browse by year, filter by categories, and use "Today" button for quick navigation
4. **Customize**: Drag to reorder categories, select from 10+ emoji categories, edit colors and names
5. **Install as App**: Use browser's "Install" option for native app experience with shortcuts
6. **Switch Themes**: Toggle between light and midnight modes for comfortable viewing

### 🚀 PWA Shortcuts (After Installation)
Once installed as an app, access these quick actions by right-clicking (desktop) or long-pressing (mobile) the app icon:
- **Add New Category**: Jump directly to category creation
- **View Today**: Navigate to today's date with smooth scrolling  
- **Manage Categories**: Open category management interface
- **Import Text**: Quick access to text-to-events import feature

## 🔧 Development

### Prerequisites
- Modern web browser with ES6 module support
- Python 3.x (for local development server)
- Git for version control

### Getting Started
```bash
# Clone the repository
git clone https://github.com/kotapullarao/calendar-planner.git
cd calendar-planner

# Start development server
npm start          # Python server on port 8000
# OR
npm run dev        # Python server on port 8080
# OR  
npm run serve      # Node.js server (requires Node.js)

# Open http://localhost:8000 in your browser
```

### CI/CD Pipeline

This project uses **GitHub Actions** for automated deployment:

#### 🔄 Workflow Overview
- **Triggers**: Every push to `main` branch and pull requests
- **Validation**: Checks file structure and JSON syntax
- **Testing**: Starts local server and tests application functionality  
- **Deployment**: Automatically deploys to GitHub Pages (main branch only)

#### 📋 What Gets Tested
- Essential files exist (index.html, manifest.json, sw.js, package.json)
- JSON files are valid (manifest.json, package.json)
- Application loads correctly at http://localhost:8000
- PWA components (manifest and service worker) are accessible

#### 🚀 Deployment Process
1. **Automatic**: Triggered on every push to main branch
2. **Conditional**: Only deploys if all tests pass
3. **Safe**: No deployment if validation fails
4. **GitHub Pages**: Live at https://kotapullarao.github.io/calendar-planner

#### 🧪 Local Testing
Run the same validation locally:
```bash
# Check required files
ls index.html manifest.json sw.js package.json

# Validate JSON syntax
python3 -m json.tool manifest.json
python3 -m json.tool package.json

# Test application
python3 -m http.server 8000
curl http://localhost:8000/ | grep "Calendar Planner"
```

### Key Dependencies
- **SortableJS**: Drag-and-drop functionality (vendored locally)
- **Onest Font**: Typography (self-hosted WOFF2 files)
- **Service Worker**: PWA functionality and offline caching
- **Zero external dependencies**: Pure vanilla JavaScript approach

### Module System
The application uses ES6 modules with organized structure:

```javascript
// Import from organized structure
import { APP_CONFIG, MONTH_NAMES } from '../config/constants.js';
import { getState, setState } from '../core/state.js';
import { $, $$ } from '../utils/dom.js';

// Example usage
const config = getState.config();
setState.currentYear(2025);
```

### State Management
Centralized state management with controlled access:

```javascript
// Import from core state module
import { getState, setState } from '../core/state.js';

// Read state
const config = getState.config();
const currentYear = getState.currentYear();

// Update state
setState.config(newConfig);
setState.currentYear(2025);

// Always trigger UI rebuild after state changes
UI.rebuild();
```

## 🎨 Theming

The application supports multiple themes through CSS custom properties:

```css
:root {
    --primary-color: #818cf8;
    --secondary-color: #f472b6;
    /* ... more variables */
}

html[data-theme="midnight"] {
    --midnight-bg: #111827;
    /* ... midnight theme overrides */
}
```

## 📱 Responsive Design

Mobile-first approach with breakpoints:
- **Desktop**: Default styles (1200px+)
- **Tablet**: 768px and below
- **Mobile**: 480px and below

## 🔒 Data Privacy

- All data is stored locally in the browser's localStorage
- No external data transmission or analytics
- Privacy-focused design with client-side processing
- No cookies, tracking, or user accounts required

## 🚀 Deployment

This project is automatically deployed to **GitHub Pages** via CI/CD pipeline:

- **Live URL**: https://kotapullarao.github.io/calendar-planner
- **Auto-deploy**: Every push to `main` branch
- **Process**: Validate → Test → Deploy

## 🤝 Contributing

To extend or modify the application:

1. **Fork the repository** and create a feature branch
2. **CSS changes**: Edit the appropriate CSS module in `/css/`
3. **JavaScript functionality**: 
   - For new features: Add to `/js/modules/`
   - For new constants: Add to `/js/config/constants.js`
   - For new utilities: Add to `/js/utils/`
4. **Follow the architecture**: Use organized module structure
5. **Testing**: Test across different devices and browsers
6. **Documentation**: Update README.md if needed

### Development Guidelines
- Maintain vanilla JavaScript approach (no build tools)
- Use ES6+ features and modules
- Follow existing naming conventions
- Test on iOS Safari, Android Chrome, and desktop browsers
- Ensure PWA functionality remains intact

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Copyright © 2025 Kota Pullarao**
