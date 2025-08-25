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
calendar/
├── index.html              # Main HTML file with PWA manifest links
├── manifest.json          # PWA manifest for app installation
├── sw.js                  # Service worker for offline functionality
├── css/                   # Modular CSS architecture
│   ├── variables.css      # CSS custom properties and design tokens
│   ├── base.css          # Global styles, resets, and typography
│   ├── layout.css        # Grid layouts and structural components
│   ├── components.css    # Reusable UI components and interactions
│   ├── modals.css        # Modal dialogs and form styles
│   ├── themes.css        # Theme system (light/midnight)
│   └── responsive.css    # Mobile-first responsive breakpoints
├── js/
│   └── modules/          # ES6 JavaScript modules
│       ├── app.js        # Application entry point and initialization
│       ├── constants.js  # Global state management and constants
│       ├── store.js      # LocalStorage data persistence layer
│       ├── ui.js         # DOM manipulation and rendering engine
│       ├── events.js     # Event handlers and user interactions
│       ├── logic.js      # Business logic and data processing
│       └── utils.js      # Pure utility functions and helpers
├── assets/               # Static assets and resources
│   ├── fonts/           # Custom font files (Onest)
│   ├── icons/           # App icons and favicon
│   └── js/vendor/       # Third-party libraries (SortableJS)
└── CLAUDE.md            # Development instructions for Claude Code
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
- **app.js**: Entry point, initialization, and module coordination
- **constants.js**: Application constants, icons, and centralized state management
- **utils.js**: Pure utility functions for date manipulation, validation, and helpers
- **store.js**: Data persistence layer with localStorage integration
- **logic.js**: Business logic, calculations, and data processing
- **ui.js**: DOM manipulation, rendering, and UI state management
- **events.js**: Event listeners, user interactions, and form handling

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
- Local web server (for CORS compatibility if needed)

### Key Dependencies
- **SortableJS**: Drag-and-drop functionality (vendored locally)
- **Onest Font**: Typography (self-hosted WOFF2 files)
- **Service Worker**: PWA functionality and offline caching

### Module System
The application uses ES6 modules with proper import/export statements:

```javascript
// Example module import
import { init } from './modules/app.js';

// Example module export
export const Utils = {
    formatDate: (date) => { /* ... */ }
};
```

### State Management
Global state is managed through the `constants.js` module with controlled access:

```javascript
// Global state getters/setters
export const getConfig = () => CONFIG;
export const setConfig = (newConfig) => CONFIG = newConfig;
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

### GitHub Pages (Recommended)
1. Fork or download this repository
2. Upload files to a new GitHub repository
3. Enable GitHub Pages in repository Settings
4. Your app will be live at `https://yourusername.github.io/repository-name`

### Other Hosting Options
- **Netlify**: Drag and drop deployment
- **Vercel**: Git integration and instant deployment  
- **Firebase Hosting**: Google's hosting platform
- **Surge.sh**: Simple static site deployment

## 🤝 Contributing

To extend or modify the application:

1. **CSS changes**: Edit the appropriate CSS module in `/css/`
2. **JavaScript functionality**: Modify the relevant module in `/js/modules/`
3. **New features**: Follow the modular architecture pattern
4. **Testing**: Test across different devices and browsers

## 📄 License


This project maintains the same license as the original codebase.
