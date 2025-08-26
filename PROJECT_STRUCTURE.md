# Project Structure

```
calendar-planner/
├── index.html              # Main HTML entry point
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker for offline functionality
├── package.json           # Project configuration
├── LICENSE                # MIT license
├── README.md              # Project documentation
├── PROJECT_STRUCTURE.md   # This file
├── 
├── css/                   # Modular CSS (load order matters)
│   ├── README.md         # CSS architecture docs
│   ├── variables.css     # CSS custom properties and design tokens
│   ├── base.css         # Global resets and base styles
│   ├── layout.css       # Grid layouts and structure
│   ├── components.css   # UI components and interactions
│   ├── modals.css       # Modal dialogs and forms
│   ├── themes.css       # Theme system (light/midnight)
│   └── responsive.css   # Mobile-first responsive design
│
├── js/                   # JavaScript modules
│   ├── config/          # Configuration and constants
│   │   └── constants.js # App constants and configuration
│   ├── core/            # Core functionality
│   │   └── state.js     # State management
│   ├── utils/           # Utility functions
│   │   └── dom.js       # DOM manipulation helpers
│   └── modules/         # Main application modules
│       ├── app.js       # Application initialization
│       ├── constants.js # Legacy re-exports (to be updated)
│       ├── store.js     # Data persistence (localStorage)
│       ├── ui.js        # DOM rendering and manipulation
│       ├── events.js    # Event handling and user interactions
│       ├── logic.js     # Business logic and calculations
│       └── utils.js     # Date utilities and helpers
│
└── assets/              # Static assets
    ├── fonts/          # Custom fonts (Onest)
    │   ├── onest.css
    │   └── onest-latin.woff2
    ├── icons/          # App icons and favicon
    │   └── favicon.svg
    └── js/vendor/      # Third-party libraries
        └── Sortable.min.js
```

## Module Dependencies

### New Organized Structure
- `js/config/constants.js` - Static configuration values
- `js/core/state.js` - Centralized state management
- `js/utils/dom.js` - DOM manipulation utilities

### Legacy Structure (being updated)
- `js/modules/constants.js` - Re-exports from new structure
- Other modules import from either legacy or new structure

## CSS Load Order (defined in index.html)
1. variables.css - Design tokens
2. base.css - Resets and typography
3. layout.css - Structure and grids
4. components.css - UI components
5. modals.css - Dialogs and forms
6. themes.css - Theme switching
7. responsive.css - Mobile adaptations

## Development

```bash
# Start development server
npm start          # Python server on port 8000
npm run dev        # Python server on port 8080  
npm run serve      # Node.js server

# Then open http://localhost:8000 in browser
```

## Code Organization Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **Modular CSS**: Load order determines cascade and specificity
3. **State Management**: Centralized in `core/state.js`
4. **Configuration**: Constants in `config/constants.js`
5. **Utilities**: Pure functions in `utils/` directory
6. **Legacy Compatibility**: Old imports work via re-exports

## File Naming Conventions

- **Kebab-case** for files: `calendar-button.css`
- **camelCase** for JavaScript: `setState`, `getConfig`
- **UPPER_CASE** for constants: `STORAGE_KEYS`, `APP_CONFIG`
- **PascalCase** for constructors/classes: `Utils`, `Store`