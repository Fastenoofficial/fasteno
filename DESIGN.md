---
name: Modern Heritage
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5e5e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdb'
  on-secondary-container: '#63635f'
  tertiary: '#725c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#caa829'
  on-tertiary-container: '#4d3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e4e2dd'
  secondary-fixed-dim: '#c8c6c2'
  on-secondary-fixed: '#1b1c19'
  on-secondary-fixed-variant: '#474744'
  tertiary-fixed: '#ffe081'
  tertiary-fixed-dim: '#e8c344'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#564500'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  section-gap: 120px
---

## Brand & Style
The design system is anchored in "Modern Heritage," a style that balances the timeless authority of traditional luxury with the clean, functional precision of contemporary digital design. The target audience consists of discerning professionals who value craftsmanship, durability, and understated elegance. 

The visual narrative relies on **Minimalism** and **High-Contrast** elements. It utilizes generous whitespace to create a "gallery" feel, allowing high-resolution product photography to serve as the primary visual driver. The emotional response should be one of quiet confidence, reliability, and exclusivity. Surfaces are kept flat and architectural, avoiding unnecessary decoration in favor of structural integrity and exquisite typographic hierarchy.

## Colors
The palette is rooted in a high-contrast relationship between **Deep Charcoal** and **Warm Ivory**, moving away from sterile pure whites to a more "paper-like" editorial feel. 

- **Primary (Deep Charcoal):** Used for typography, primary buttons, and structural lines to provide a grounded, authoritative presence.
- **Secondary (Warm Ivory):** The primary canvas color. It provides a soft, premium backdrop that feels more organic than standard white.
- **Tertiary (Antique Gold):** Reserved for subtle accents, thin borders, and premium indicators. It should be used sparingly to maintain its value.
- **Accent (Muted Burgundy):** Used for micro-interactions, special alerts, or seasonal highlights to inject a sense of heritage and warmth.

## Typography
The typographic strategy uses a classic Serif/Sans-Serif pairing to denote the "Modern Heritage" theme. **Playfair Display** provides the editorial, high-fashion voice for headlines, while **Inter** ensures maximum legibility and a modern technical edge for functional copy.

Headlines should utilize tighter letter-spacing to feel more "locked-in" and intentional. Labels and buttons use uppercase Inter with increased tracking (letter-spacing) to evoke the feeling of luxury watch branding and high-end stationery.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model for desktop to maintain tight control over line lengths and image aspect ratios, transitioning to a fluid model for mobile.

- **Desktop:** 12-column grid with a 1280px max-width. Margins are intentionally wide (64px) to emphasize the premium nature of the brand.
- **Section Vertical Spacing:** Large 120px gaps between major sections to allow the content to "breathe" and prevent visual clutter.
- **Rhythm:** All spacing is derived from an 8px base unit. Component-level spacing (padding inside cards/buttons) should favor ample breathing room over density.

## Elevation & Depth
In alignment with the "Modern Heritage" aesthetic, this design system rejects heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

Depth is communicated through color blocking (e.g., a Charcoal footer against an Ivory body) rather than physical elevation. When an element must appear elevated (like a dropdown or modal), use a very soft, high-diffusion shadow with a 2% Deep Charcoal tint to maintain a flat, sophisticated look. Thin 1px borders in Antique Gold or subtle Grey are the primary tool for defining object boundaries.

## Shapes
The shape language is strictly **Sharp (0)**. Right angles communicate precision, architectural stability, and formal discipline. There are no rounded corners in this design system; every container, button, and input field must feature crisp 90-degree angles. This severity is balanced by the warmth of the color palette and the softness of the serif typography.

## Components
- **Buttons:** Primary buttons are solid Deep Charcoal with Ivory text, uppercase. Secondary buttons use a 1px Antique Gold border with Charcoal text. All buttons feature sharp corners and a subtle hover state that shifts the background to a slightly lighter tint.
- **Cards:** Product cards are borderless with a "ghost" background of slightly darker Ivory (#F2EFE9) that appears on hover. Product titles use `headline-md` and prices use `body-md`.
- **Input Fields:** Minimalist design featuring only a bottom border (1px Charcoal). Labels sit above in `label-caps`. The focus state thickens the bottom border to 2px.
- **Lists:** Clean, strictly aligned rows separated by thin 1px horizontal lines (#E5E5E5). Icons, if used, are thin-stroke (1px) and purely functional.
- **Chips/Filters:** Rectangular boxes with 1px borders. Selected states use a solid Charcoal background with Ivory text.
- **Navigation:** A persistent, centered top-bar navigation with high-density tracking on links. A "breadcrumb" system is required for deep product categories to assist with the professional, organized vibe.