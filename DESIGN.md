---
name: Enterprise Productivity Framework
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8dae2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fb'
  surface-container: '#ecedf6'
  surface-container-high: '#e7e8f0'
  surface-container-highest: '#e1e2ea'
  on-surface: '#191c21'
  on-surface-variant: '#424752'
  inverse-surface: '#2e3036'
  inverse-on-surface: '#eff0f8'
  outline: '#727783'
  outline-variant: '#c2c6d4'
  surface-tint: '#005db5'
  primary: '#00488d'
  on-primary: '#ffffff'
  primary-container: '#005fb8'
  on-primary-container: '#cadcff'
  inverse-primary: '#a8c8ff'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#7b3200'
  on-tertiary: '#ffffff'
  tertiary-container: '#a04401'
  on-tertiary-container: '#ffd1bc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#00468b'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783100'
  background: '#f9f9ff'
  on-background: '#191c21'
  surface-variant: '#e1e2ea'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 40px
  gutter: 20px
---

## Brand & Style
This design system is built for high-stakes data management and financial consolidation. It prioritizes **Reliability, Precision, and Flow**. The aesthetic is a hybrid of Modern Corporate and High-Utility SaaS, blending the systematic rigor of enterprise tools with the refined, minimalist execution found in developer-centric productivity apps.

The visual language follows a **Modern Professional** style:
- **Cleanliness:** Maximum whitespace to reduce cognitive load during complex data entry.
- **High Utility:** Interaction patterns are optimized for speed and repetition.
- **Reliability:** A stable, predictable grid that evokes a sense of security for sensitive enterprise data.

## Colors
The palette is rooted in **Enterprise Blue**, a color associated with stability and institutional trust. 

- **Primary:** Used for the most important actions, active states, and focus indicators.
- **Surface & Background:** A clear distinction is maintained between the page background (#F3F4F6) and interactive surfaces (#FFFFFF) to create natural depth without heavy shadows.
- **Neutrals:** A scale of cool greys is used for secondary text, borders, and disabled states.
- **Semantic Colors:** Critical for data validation; red for consolidation errors, green for successful imports, and amber for pending reviews.

## Typography
**Inter** is the primary typeface, selected for its exceptional legibility in data-dense environments and its neutral, professional character. 

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong hierarchy.
- **Body Text:** Standardized at 14px for density without sacrificing readability.
- **Monospace:** Use **JetBrains Mono** sparingly for cell references, formulas, or raw data strings to distinguish them from interface labels.
- **Accessibility:** Line heights are generous (1.4x - 1.5x) to prevent "line-skipping" when reading wide tables of financial data.

## Layout & Spacing
The layout uses a **8px linear scale** for consistent rhythm. 

- **Grid:** A 12-column fixed-fluid hybrid grid. On desktop, content is centered with a max-width of 1440px. 
- **Density:** The "Normal" density uses 16px padding for cards. A "Compact" mode is available for data-heavy tables, reducing row height and padding to 8px.
- **Responsive Behavior:** 
  - **Desktop:** Sidebar-driven navigation (240px fixed width).
  - **Tablet:** Sidebar collapses into an icon-only rail or drawer.
  - **Mobile:** Single column stacking; typography scales down (e.g., `display-lg` becomes `headline-lg`).

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Subtle Soft Shadows** rather than high-contrast gradients.

- **Level 0 (Background):** #F3F4F6 - The base canvas.
- **Level 1 (Cards/Surface):** #FFFFFF with a 1px border (#E5E7EB). This is the default state for content containers.
- **Level 2 (Overlays/Dropdowns):** #FFFFFF with a soft ambient shadow (`0px 4px 12px rgba(0, 0, 0, 0.05)`).
- **Level 3 (Modals):** High-diffusion shadow (`0px 20px 40px rgba(0, 0, 0, 0.1)`) with a backdrop blur (8px) on the Level 0 layer.

## Shapes
The shape language is structured and "soft-geometric." 

- **Base Radius:** 8px (0.5rem) for buttons, input fields, and small UI components.
- **Container Radius:** 12px (0.75rem) for cards and main content areas.
- **Pill:** Reserved specifically for status indicators (Chips/Tags) to make them instantly distinguishable from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Enterprise Blue with white text. 8px radius.
- **Secondary:** White background, 1px border (#E5E7EB), Blue text.
- **Ghost:** No border or background unless hovered. Used for low-priority actions in toolbars.

### Input Fields
- **Default State:** White background, 1px grey border. 
- **Focus State:** 2px Blue border with a soft blue outer glow (2px spread, 15% opacity).
- **Labeling:** Top-aligned, 12px `label-md` for maximum clarity.

### Cards
- Always use white surfaces. 12px rounded corners. 
- Include a 1px border (#E5E7EB) to ensure visibility against the light grey background.

### Tables (Critical Component)
- **Header:** Light grey background (#F9FAFB), bold 12px labels, 1px bottom border.
- **Rows:** Alternating zebra stripes (very subtle) or simple 1px dividers.
- **Hover:** Highlight row in #F3F4F6 to aid horizontal scanning.

### Chips & Status
- **Style:** Small, pill-shaped, using 10% opacity of the semantic color for the background and 100% for the text (e.g., Light Red background with Dark Red text for "Error").

### Icons
- Use **2px stroke weight** minimalist line icons. Icons should be monochrome (Secondary Grey) unless they indicate a specific status or primary action.