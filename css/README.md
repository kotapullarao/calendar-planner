# CSS Architecture

This directory contains modular CSS files that should be loaded in a specific order:

## Load Order (as defined in index.html)

1. **variables.css** - CSS custom properties and design tokens
2. **base.css** - Global resets, typography, and base styles  
3. **layout.css** - Grid layouts and structural components
4. **components.css** - Reusable UI components and interactions
5. **modals.css** - Modal dialogs and form styles
6. **themes.css** - Theme-specific overrides (light/midnight)
7. **responsive.css** - Mobile-first responsive breakpoints

## File Responsibilities

- **variables.css**: Color schemes, spacing, typography scales
- **base.css**: HTML element resets, body styles, global typography
- **layout.css**: Container grids, header, main layout structure
- **components.css**: Buttons, cards, inputs, calendar components
- **modals.css**: Modal overlays, forms, dialog styles
- **themes.css**: Theme switching via `[data-theme]` attribute
- **responsive.css**: Media queries and mobile adaptations

## Naming Convention

- Use BEM methodology: `.block__element--modifier`
- Prefix utility classes with purpose: `.is-hidden`, `.has-error`
- Component classes: `.calendar-button`, `.stat-card`
- Layout classes: `.container`, `.header-controls`