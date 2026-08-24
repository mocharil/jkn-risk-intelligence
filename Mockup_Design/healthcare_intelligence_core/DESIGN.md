---
name: Healthcare Intelligence Core
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e8eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d9e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3d4a3e'
  inverse-surface: '#273143'
  inverse-on-surface: '#ecf0ff'
  outline: '#6d7b6d'
  outline-variant: '#bccabb'
  surface-tint: '#006d33'
  primary: '#006b32'
  on-primary: '#ffffff'
  primary-container: '#008740'
  on-primary-container: '#f7fff3'
  inverse-primary: '#5adf82'
  secondary: '#006495'
  on-secondary: '#ffffff'
  secondary-container: '#5fbbfd'
  on-secondary-container: '#004a6f'
  tertiary: '#a72e4a'
  on-tertiary: '#ffffff'
  tertiary-container: '#c84761'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#78fc9c'
  primary-fixed-dim: '#5adf82'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#005225'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#8fcdff'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#004b71'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bb'
  on-tertiary-fixed: '#400012'
  on-tertiary-fixed-variant: '#8a1636'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d9e3fb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
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
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-desktop: 32px
  container-padding-mobile: 16px
  gutter: 24px
  sidebar-width: 280px
---

## Brand & Style

The design system is engineered for high-stakes healthcare governance and risk analytics. It balances the institutional trust of national healthcare systems with the precision of a modern intelligence platform. 

The aesthetic is **Professional Intelligence**: a synthesis of clean healthcare layouts, rigorous data density, and subtle futuristic accents. It utilizes a "White Plus" strategy—vast white space punctuated by green-tinted surfaces to define hierarchy without visual clutter. The emotional response is one of absolute reliability, clarity under pressure, and forward-thinking technological capability.

**Design Pillars:**
- **Institutional Clarity:** High legibility and structured information architecture inspired by national health standards.
- **Analytical Precision:** Compact spacing and sharp data visualization.
- **Augmented Intelligence:** Subtle AI indicators (gradients and sparks) that feel integrated rather than decorative.

## Colors

The palette is anchored by **BPJS Green (#00A651)**, serving as the primary bridge to institutional healthcare trust. This is supported by deep forest variations for high-contrast text and interactive states.

- **Primary Green:** Use `#00A651` for primary actions. Use `#08783E` for hover states and `#075C35` for deep header text or active navigation icons.
- **Intelligence Blue:** `#1689C8` is reserved strictly for analytics, data visualization, and "Intelligence" mode indicators.
- **Surfaces:** The global background is `#F8FBFA`. Use `#E7F7EE` (Soft Tint) for container backgrounds that require subtle distinction from the main canvas.
- **Risk Scale:** Adhere strictly to the defined Red-to-Green semantic scale for risk scoring and status indicators.
- **AI Accents:** Utilize a linear gradient from `#00A651` to `#1689C8` at 135 degrees for AI-driven insights or automated recommendation cards.

## Typography

This design system utilizes **Inter** across all levels to maintain a systematic, utilitarian feel. The hierarchy is optimized for data-dense environments.

- **Headlines:** Use Semi-Bold (600) for section headers to ensure strong visual anchoring. 
- **Data Labels:** Small labels (`label-sm`) should use uppercase with slight tracking to differentiate metadata from body content.
- **Language Integration:** When mixing Bahasa Indonesia and English technical terms, maintain consistent styling. Use italics sparingly for English technical terms only when they appear within a primary Bahasa sentence (e.g., *fraud detection* system).

## Layout & Spacing

The system employs a **12-column fluid grid** for the main content area, anchored by a fixed left-hand navigation sidebar.

- **Rhythm:** An 8px base grid is used for general layout, with a 4px sub-grid for compact enterprise components (inputs, table rows).
- **Sidebar:** A clean, white fixed sidebar at 280px. It uses a 1px border (#E4E7EC) instead of a shadow to maintain a flat, professional profile.
- **Compactness:** For data tables and risk dashboards, vertical cell padding is reduced to 8px to maximize information density ("Enterprise Compact").

## Elevation & Depth

Hierarchy is primarily communicated through **Tonal Layering** rather than heavy shadows.

- **Level 0 (Canvas):** `#F8FBFA`.
- **Level 1 (Cards/Containers):** Pure white `#FFFFFF` with a 1px border in `#E4E7EC`.
- **Level 2 (Dropdowns/Modals):** Pure white with a "Soft Intelligence" shadow: `0px 12px 16px -4px rgba(0, 166, 81, 0.08)`. Note the subtle green tint in the shadow to unify with the brand.
- **AI States:** Elements powered by AI use a subtle glow effect (`0px 0px 12px rgba(22, 137, 200, 0.15)`).

## Shapes

The shape language is "Soft Professional." 

- **Standard Components:** Buttons and input fields use a **8px (0.5rem)** radius.
- **Cards:** Dashboard cards and containers use a larger **12px to 16px** radius to soften the data-heavy layout and provide a modern feel.
- **Chips/Badges:** Risk badges use a full pill-shape (32px) for instant recognition.

## Components

### Buttons
- **Primary:** Solid `#00A651` with white text.
- **Secondary:** White background, `#D0D5DD` border, `#344054` text.
- **AI Action:** Gradient background (Green to Blue) with a ✦ (Spark) icon prefix.

### Cards
- White background, 1px `#E4E7EC` border, 12px radius. 
- Headers within cards should have a subtle bottom border or a light green (`#E7F7EE`) top-strip for "Critical" or "High Risk" categories.

### Risk Indicators
- Use colored "dot" indicators or full-width progress bars using the Risk Palette.
- **Critical Risk** labels must always be accompanied by a warning icon.

### Data Visualization
- **Risk Maps:** Use hexagonal tiling or heatmaps.
- **Network Graphs:** Nodes should be color-coded by risk level. Use the Supporting Blue (`#1689C8`) for connection lines to signify intelligence links.

### Input Fields
- Labels are always positioned above the field in `label-md` style.
- Active states use a 2px `#00A651` focus ring with 20% opacity.

### Navigation Sidebar
- High-contrast white background. 
- Active states use a "Left-edge active bar" (4px width, `#00A651`) and a light green background tint (`#E7F7EE`) for the entire menu item row.