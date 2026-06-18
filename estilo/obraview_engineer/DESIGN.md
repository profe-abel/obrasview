---
name: ObraView Engineer
colors:
  surface: '#12121d'
  surface-dim: '#12121d'
  surface-bright: '#383845'
  surface-container-lowest: '#0d0d18'
  surface-container-low: '#1b1a26'
  surface-container: '#1f1e2a'
  surface-container-high: '#292935'
  surface-container-highest: '#343440'
  on-surface: '#e3e0f1'
  on-surface-variant: '#c0c7d4'
  inverse-surface: '#e3e0f1'
  inverse-on-surface: '#302f3b'
  outline: '#8a919e'
  outline-variant: '#414752'
  surface-tint: '#a4c9ff'
  primary: '#a4c9ff'
  on-primary: '#00315d'
  primary-container: '#4a9eff'
  on-primary-container: '#003463'
  inverse-primary: '#005fad'
  secondary: '#ffb961'
  on-secondary: '#472a00'
  secondary-container: '#e89300'
  on-secondary-container: '#563400'
  tertiary: '#ebb2ff'
  on-tertiary: '#500a6c'
  tertiary-container: '#c681e1'
  on-tertiary-container: '#53106f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a4c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004884'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#ffb961'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663e00'
  tertiary-fixed: '#f8d8ff'
  tertiary-fixed-dim: '#ebb2ff'
  on-tertiary-fixed: '#320047'
  on-tertiary-fixed-variant: '#692984'
  background: '#12121d'
  on-background: '#e3e0f1'
  surface-variant: '#343440'
  surface-navy: '#1a1a2e'
  border-muted: '#2a2a45'
  issue-red: '#e74c3c'
  collision-orange: '#e67e22'
  text-primary: '#e0e0e0'
  text-secondary: '#888888'
  text-tertiary: '#555555'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 12px
  margin-mobile: 16px
  margin-desktop: 24px
  window-padding: 12px
---

## Brand & Style

The design system for this professional BIM platform is rooted in a **Technical / Modern** aesthetic that prioritizes high-density information and structural clarity. It evokes a sense of "Engineering Precision"—reliable, sophisticated, and data-driven. 

The visual language utilizes a **Glassmorphic** approach for management layers, suggesting that data is an overlay sitting precisely on top of the physical 3D model. The interface should feel like a high-end CAD workstation: dark environments to reduce eye strain during long coordination sessions, paired with vibrant, functional color-coding for status and categorization.

Key attributes:
- **Depth:** Multi-layered windows with backdrop blurs to maintain context of the 3D model.
- **Precision:** Thin 1px borders and tight spacing to maximize information density.
- **Functionality:** Every color carries semantic meaning (Tree, Properties, Issues).
- **Organization:** A persistent dock provides a "home base" for minimized tools, preventing UI clutter.

## Colors

The palette is anchored in a deep **Navy Dark (#0f0f1a)** to provide a professional, low-fatigue backdrop for complex 3D geometry. 

- **Primary Blue (#4a9eff):** Used for global actions, high-level navigation, and general selection highlights.
- **Semantic Accents:** Colors are assigned to specific functional domains to aid rapid identification:
    - **Amber (#f39c12):** Property metadata and technical specifications.
    - **Purple (#9b59b6):** Navigation hierarchies and the element tree.
    - **Red (#e74c3c):** Conflict resolution, issues, and critical warnings.
- **Glassmorphism:** Surfaces use a semi-transparent variation of the surface-navy with a strong backdrop blur to maintain legibility against the 3D viewport.

## Typography

This design system utilizes **Hanken Grotesk** as the primary typeface for its modern, sharp, and highly legible characteristics in dark environments. For data-heavy contexts, coordinates, and technical labels, **JetBrains Mono** is introduced to provide a distinctive "code-like" precision that fits the engineering aesthetic.

Typography is kept relatively small (standard 14px body) to facilitate the high density required for BIM management. Use `label-sm` for non-editable metadata and `headline-md` for floating window titles.

## Layout & Spacing

The layout is **contextual and non-grid based**, relying on a flexible system of **Floating Draggable Windows** over a full-screen 3D viewport. 

- **The Viewport:** The primary canvas fills 100% of the background.
- **Floating Windows:** Use a 4px base unit for internal padding. Most management panels should have a default width of 320px (Properties) or 400px (Gantt).
- **The Dock:** A persistent bottom bar (height: 56px) houses minimized tools and global view controls.
- **Responsive Behavior:** 
  - On mobile, floating windows transition to full-width "sheets" that slide from the bottom.
  - Windows snap to edges when dragged within 20px of the viewport boundary.

## Elevation & Depth

Hierarchy is established through **translucency and stacking order** rather than traditional shadows.

- **Surface Layers:** Windows use `rgba(22, 22, 42, 0.85)` with a `backdrop-filter: blur(12px)`.
- **Borders:** Every window and input is defined by a crisp 1px solid border (`#2a2a45`).
- **Active State:** The focused window is highlighted with a 1px border using its semantic accent color (e.g., Purple for the Tree window) and a very subtle outer glow (0px 0px 8px) of the same color.
- **Z-Index Strategy:**
  - Context Menus: 100
  - Tooltips: 90
  - Active Floating Window: 80
  - Inactive Floating Windows: 70
  - Bottom Dock: 60

## Shapes

The shape language is **Soft (0.25rem)** to maintain a professional, architectural feel. 

- **Standard Elements:** Buttons, inputs, and window containers use a 4px (0.25rem) radius.
- **The Dock:** The bottom persistent dock uses a higher roundedness (0.75rem) on its top corners only to distinguish it as a permanent UI anchor.
- **Status Indicators:** Use sharp squares or circles for status pips to keep the interface feeling precise.

## Components

### Floating Windows
The core component. Must include a `header` area for dragging, a `title` with its specific semantic accent color, and `action-icons` (minimize, close). The body should be scrollable with a custom-themed thin scrollbar.

### Buttons
- **Primary:** Solid `#4a9eff` with white text.
- **Secondary/Ghost:** Transparent background with `#2a2a45` border.
- **IconButton:** Square 32x32px buttons with 1px borders, used heavily in the View Toolbar.

### Form Inputs
Inputs should have a darker navy background (`#1a1a30`) to inset them into the glass surfaces. On focus, the border should change to the window's specific accent color.

### The Dock
A semi-transparent blur-container at the bottom center. Icons within the dock represent minimized windows; they should show a small colored dot underneath if the window is currently open but hidden behind others.

### Data Lists (Tree/Properties)
Use zebra-striping with `rgba(255,255,255,0.03)` for readability. Hover states should use a subtle highlight of the primary blue at 10% opacity.

### Chips & Badges
Small, high-contrast badges for "Phase" or "Status." Use the `label-sm` typography (JetBrains Mono) for these elements.