# Calendar Planner - Progressive Web App

A modern, feature-rich calendar planning application built with vanilla JavaScript ES6 modules and modular CSS. Designed for seamless cross-platform use with full PWA capabilities, offline functionality, and native app-like experience.

## 🚀 Core Features

### 📅 Advanced Calendar System
- **Year-Based View**: Full 12-month calendar display with intuitive month-by-month navigation
- **Month/Year Toggle**: Seamless switching between detailed month view and comprehensive year overview
- **Smart Today Navigation**: Instant jump to current date with visual highlighting of the actual in-month cell
- **Double-Click Quick Add**: Click any calendar day to instantly add events with date pre-filled
- **Responsive Grid Layout**: Adaptive calendar sizing that works perfectly on desktop, tablet, and mobile

### 🎨 Event Categories & Organization
- **Full CRUD Operations**: Create, read, update, and delete event categories with rich customization options
- **Drag-and-Drop Reordering**: Intuitive category ordering using SortableJS with synchronized views
- **Custom Colors**: Extensive color palette with visual preview for category identification
- **Smart Statistics**: Real-time category usage tracking with filtering and sorting capabilities
- **Synchronized Ordering**: Stat cards and manage categories always maintain consistent order

### 😊 Enhanced Emoji & Template System  
- **Comprehensive Emoji Picker**: 10+ categorized emoji collections (Smileys, People, Work, Travel, etc.)
- **Smart Usage Tracking**: Recently used and frequently used emojis for quick access
- **Cross-Platform Compatibility**: Automatic fallbacks ensure emoji display across all devices
- **Template Gallery**: Pre-built category templates for common use cases (work, personal, travel)
- **Multi-Emoji Support**: Add multiple emojis per category (up to 10 characters)

### 📄 Intelligent Import/Export System
- **Text-to-Events Parsing**: Advanced text analysis to automatically extract dates, events, and categories
- **Advanced Backup System**: Complete backup/restore with three merge modes:
  - **Replace**: Complete data replacement
  - **Merge Skip**: Keep existing, add new
  - **Merge Rename**: Rename conflicts and merge all
- **File Drag-and-Drop**: Intuitive backup file import with visual feedback
- **Preview System**: See what will be imported before confirming changes

### 🌈 Themes & Visual Customization
- **Dual Theme System**: Light and Midnight themes with instant switching
- **Gradient Month Headers**: Optional beautiful gradient themes for month headers with 12+ options
- **Consistent Design Language**: Unified design system with CSS custom properties
- **Responsive Typography**: Onest font family optimized for readability across all devices
- **Smooth Animations**: Polished transitions and micro-interactions throughout the interface

### 📱 Progressive Web App (PWA) Features
- **Native App Experience**: Install to device home screen on iOS, Android, and Desktop
- **Offline-First Design**: Complete functionality without internet connection using service worker caching
- **PWA Shortcuts**: Quick actions available from app icon (Add Category, View Today, Manage, Import)
- **Background Sync**: Seamless data persistence and automatic updates when connectivity returns
- **Responsive Performance**: Optimized loading with intelligent caching strategies

### ⚡ Enhanced User Experience
- **Labeled Quick Actions**: Floating Action Button (FAB) with descriptive labels for all major features
- **Interactive Walkthrough**: First-time user guided tour with helpful tips and feature explanations  
- **Touch-Optimized**: Long-press prevention, improved touch targets, and gesture-friendly interactions
- **Keyboard Accessibility**: Full keyboard navigation support with proper ARIA labels
- **Stats Toggle Persistence**: User preferences (show/hide stats) persist across browser sessions
- **Smart Auto-Save**: All changes automatically saved to local storage with no manual save required

### 🔒 Privacy & Performance
- **100% Local Storage**: All data stays on your device - no external servers, tracking, or data collection
- **Zero Dependencies**: Pure vanilla JavaScript with only essential libraries (SortableJS for drag-and-drop)
- **Efficient Rendering**: Minimal DOM manipulation with optimized update cycles for smooth performance
- **Cross-Browser Compatibility**: Works on all modern browsers with graceful fallbacks

## 📁 Project Structure

```
calendar-planner/
├── index.html              # Main HTML entry point
├── manifest.json          # PWA manifest for app installation
├── sw.js                  # Service worker for offline functionality
├── package.json           # Project configuration and scripts
├── LICENSE                # MIT license
├── 
├── css/                   # Modular CSS architecture
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
- **layout.css**: Grid layouts, structural components, and unified header controls
- **components.css**: Reusable UI components and segmented toggles (animated indicator)
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

### 🎯 Quick Start Guide

#### First Time Users
1. **Interactive Walkthrough**: On first visit, click "Start Tour" to get a guided introduction to all features
2. **Create Your First Category**: Use the ✨ "Add New Category" button to create custom event categories
3. **Pick Emojis & Colors**: Use the comprehensive emoji picker with smart suggestions and color palette

#### Core Workflow
1. **Organize with Categories**:
   - Click "Manage Categories" to create, edit, and organize your event types
   - Drag and drop to reorder categories (both in stats and manage views stay synced)
   - Use templates for quick setup (work, personal, travel categories)

2. **Add Events**:
   - Double-click any calendar day for quick event addition
   - Use text import for bulk event creation from schedules or notes
   - Categories are automatically suggested based on text patterns

3. **Navigate & View**:
   - **Month/Year Toggle**: Switch between detailed month and full-year 12-month view
   - **Today Button**: Instantly jump to current date with visual highlighting  
   - **Statistics Cards**: Click any stat card to filter calendar by that category
   - **Smart Navigation**: Previous/next arrows integrated into the header for space efficiency

4. **Customize Experience**:
   - **Theme Switching**: ☀️/🌙 toggle between Light and Midnight themes
   - **Gradient Headers**: Optional beautiful gradient themes for month headers
   - **Drag to Reorder**: Categories maintain consistent order across all views
   - **Stats Toggle**: Show/hide statistics panel (preference persists)

#### Advanced Features
- **Backup & Restore**: Export/import with advanced merge options (Replace, Merge Skip, Merge Rename)
- **PWA Installation**: Install as native app with shortcuts and offline functionality
- **Keyboard Navigation**: Full accessibility support with proper ARIA labels

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

This project uses **GitHub Actions** for automated deployment with production + preview sites:

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
1. **Automatic (main)**: Every push to `main` publishes production at site root.
2. **Automatic Previews**: Every push to any other branch publishes to `/previews/<branch>`.
3. **Delete Cleanup**: Deleting a branch removes only its preview folder.
4. **Nightly Reconcile**: A scheduled job prunes stale preview folders.
5. **Validation**: Required files, JSON syntax, and a quick smoke test run before publish.
6. **GitHub Pages**: Production lives at https://kotapullarao.github.io/calendar-planner

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

### Preview Deploys
- Just push your branch — it appears under `/previews/<branch>`.
- Previews index: `/previews/` lists all active previews.
- Optional: set repository variable `PREVIEW_SUBPATH` to change the subfolder name (defaults to `previews`).

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

### Responsive Layout Notes
- Calendar grid keeps its original minimum width. The calendars grid uses `repeat(auto-fit, minmax(380px, 1fr))` so month cards don’t over‑shrink and remain readable.
- Other app sections now respect a global minimum width via `.container { min-width: 420px; }`, preventing the header, controls, and stats from shrinking past the calendar’s comfortable size.
- To fine‑tune behavior:
  - Reduce or increase the global limit by adjusting `min-width` on `.container` in `css/layout.css`.
  - For different month card density, change the `minmax(380px, 1fr)` value in `css/layout.css` and `css/themes.css`.

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

## 🔗 Calendar Subscriptions (ICS)

Subscribe to an internet calendar and its events appear as a read-only category
alongside your own. Open the **Subscribe** action in the floating menu, paste an
`.ics` URL, and the feed is fetched, parsed, and refreshed automatically while
the app is open.

**Where to find your `.ics` link**

| Provider | Path |
|---|---|
| Google Calendar | Settings → *Settings for my calendars* → **Secret address in iCal format** |
| Outlook / Microsoft 365 | Settings → Calendar → Shared calendars → **Publish a calendar** (ICS) |
| Apple iCloud | Calendar sidebar → share icon → **Public Calendar** (gives a `webcal://` link) |

`webcal://` links are accepted and converted to `https://` automatically.

**What is supported**

- All-day, timed, and multi-day events (`DTEND` is treated as exclusive per RFC 5545)
- Recurrence via `RRULE` — `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY`, with
  `INTERVAL`, `COUNT`, `UNTIL`, and `BYDAY`; `EXDATE` exclusions are honoured
- Folded lines, escaped text, `CRLF`, and quoted parameters
- Occurrences are expanded once per sync across a window of one year back to
  three years forward

**The CORS caveat — and the 5-minute fix**

Most providers do not send CORS headers on their feeds, so the browser blocks a
direct request. Subscriptions therefore need a proxy you control. A ready-to-use
worker ships in this repo:

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) → *Workers &
   Pages* → *Create* → choose the **"Hello World" Worker** template and deploy
   it as-is. (Don't use the drag-and-drop *Upload assets* option — it only
   hosts static files and refuses Worker code.)
2. On the worker's page click **Edit code**, replace everything with
   [`proxy/cloudflare-worker.js`](proxy/cloudflare-worker.js), check its
   `ALLOWED_ORIGINS` includes the address you open the app from, and deploy
3. In **Subscriptions → Settings** set the proxy to
   `https://<your-worker>.workers.dev/?url={url}` and hit **Test**

The `{url}` placeholder is replaced with the encoded feed URL, otherwise the URL
is appended. Feed URLs are often secret, so prefer your own proxy over a public
one. Feeds that *do* send CORS headers work with no proxy at all. Cloudflare's
free tier (100k requests/day) is far more than calendar syncing ever uses.

**Behaviour notes**

- Refresh happens only while the app is open. Browsers do not offer dependable
  background sync, so this is deliberately foreground-only; it also re-syncs
  immediately when connectivity returns.
- The last successful sync is cached in `localStorage`, so subscribed events
  still render offline.
- Subscribed categories are read-only — editing one opens its subscription
  settings rather than the category form, since the next sync would overwrite
  any manual edits.
- A subscribed calendar is never used as the "public holidays" source, even if
  its name says so, to avoid silently changing the counts of other categories.

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
