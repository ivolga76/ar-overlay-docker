---
version: alpha
name: cybershoke.net
description: Dark gaming marketplace and CS2 server hub with high-contrast blue accents, compact navigation, large game-mode cards, and conversion-focused CTAs.
colors:
  primary: "#6080ff"
  secondary: "#131b2e"
  tertiary: "#11141c"
  neutral: "#1a2030"
  surface: "#131b2e"
  on-surface: "#ffffff"
  background: "#11141c"
  text: "#ffffff"
  error: "#ff5b6e"
typography:
  fontFamily: "Roboto"
  headline-display:
    fontFamily: "Roboto"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "0px"
  headline-lg:
    fontFamily: "Roboto"
    fontSize: "27px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "0px"
  headline-md:
    fontFamily: "Roboto"
    fontSize: "23px"
    fontWeight: 500
    lineHeight: "28px"
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Roboto"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "normal"
    letterSpacing: "0px"
  body-md:
    fontFamily: "Roboto"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "normal"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Roboto"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "normal"
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Roboto"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "normal"
    letterSpacing: "0px"
  label-md:
    fontFamily: "Roboto"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "normal"
    letterSpacing: "0px"
  label-sm:
    fontFamily: "Roboto"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "0px"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "40px"
  lg: "70px"
  xl: "96px"
components:
  button:
    primary:
      backgroundColor: "#6080ff"
      color: "#ffffff"
      borderColor: "#ffffff"
      borderRadius: "8px"
      borderWidth: "0px"
      borderStyle: "none"
      padding: "13px 19px"
      fontSize: "12px"
      fontWeight: 500
      minWidth: "189px"
      minHeight: "38px"
      textDecoration: "none"
      boxShadow: "none"
      fontFamily: "Roboto"
    secondary:
      backgroundColor: "transparent"
      color: "#6080ff"
      borderColor: "#6080ff"
      borderRadius: "8px"
      borderWidth: "0px"
      borderStyle: "none"
      padding: "13px 19px"
      fontSize: "12px"
      fontWeight: 500
      minWidth: "189px"
      minHeight: "38px"
      textDecoration: "none"
      boxShadow: "none"
      fontFamily: "Roboto"
    link:
      backgroundColor: "transparent"
      color: "#ffffff"
      borderColor: "transparent"
      borderRadius: "0px"
      borderWidth: "0px"
      borderStyle: "none"
      padding: "0px"
      fontSize: "12px"
      fontWeight: 400
      minWidth: "0px"
      minHeight: "0px"
      textDecoration: "underline"
      boxShadow: "none"
      fontFamily: "Roboto"
  card:
    backgroundColor: "#131b2e"
    borderColor: "#6080ff"
    borderRadius: "12px"
    borderWidth: "2px"
    borderStyle: "solid"
    padding: "24px 16px"
    boxShadow: "none"
    textColor: "#ffffff"
---

# Overview

cybershoke.net is a dark, competitive gaming interface for CS2 server browsing, league promotion, and account conversion. The experience prioritizes quick scanning, dense content discovery, and prominent blue CTA states.

The visual tone is pragmatic and esports-oriented: dark chrome surfaces, bright primary blue, high-contrast white text, and compact controls. Marketing content sits above or alongside gameplay navigation without overpowering the server list.

# Colors

Use a near-black base with muted blue-gray surfaces and a vivid blue accent.

- **Background:** `#11141c`
- **Surface / card base:** `#131b2e`
- **Primary accent:** `#6080ff`
- **Text / on-surface:** `#ffffff`

Recommended usage:
- Use `#11141c` for the page shell and full-bleed areas.
- Use `#131b2e` for navigation rails, cards, popovers, and content panels.
- Use `#6080ff` for active states, primary buttons, pills, focus affordances, and selected borders.
- Use white text on all dark surfaces; avoid low-opacity body copy except in secondary metadata.
- Use error red sparingly for notifications and destructive states; no exact red token was provided, so treat it as implementation-specific and keep it visually subordinate.

# Typography

Roboto is the system font. Typography is compact, bold, and optimized for dense dashboards.

## Token mapping
- `headline-display` — 32px / 38px / 700
- `headline-lg` — 27px / 32px / 700
- `headline-md` — 23px / 28px / 500
- `body-lg` — 16px / normal / 500
- `body-md` — 16px / normal / 500
- `body-sm` — 12px / normal / 500
- `label-lg` — 12px / normal / 500
- `label-md` — 12px / normal / 500
- `label-sm` — 12px / normal / 400

## Guidance
- Use heavier weights for navigation labels, card titles, and status counts.
- Keep letter spacing at `0px`; the interface depends on legibility, not decorative tracking.
- Use short, functional copy. The UI is designed for fast selection, not long-form reading.

# Layout

The layout is left-nav first, with a top utility bar and a dense grid of large clickable mode cards.

## Structure
- **App shell:** dark full-height viewport.
- **Sidebar:** fixed-width left rail with primary navigation and promotional blocks.
- **Top bar:** compact utility strip with game selector, counters, login action, and alert banner.
- **Content area:** filter chips and a card grid of game modes and server entry points.

## Spacing
Use the following spacing scale:
- `xs` — `8px`
- `sm` — `16px`
- `md` — `40px`
- `lg` — `70px`
- `xl` — `96px`

## Rules
- Prefer compact horizontal padding and tight internal card spacing.
- Use `md` and above only for section separation, hero blocks, and major callouts.
- Maintain generous card height so image-led tiles remain readable over background artwork.

# Elevation & Depth

The design system is intentionally flat.

- Shadows are effectively none across the system.
- Depth comes from color contrast, borders, and layering rather than blur or elevation.
- Use darker overlays for modals and popovers.
- Use bright borders to signal focus, hover, and active selection.

Practical layering order:
1. App background
2. Sidebar and content surfaces
3. Cards and chips
4. Modals / promotional popovers
5. Floating action button and transient notifications

# Shapes

Rounded corners are moderate and consistent.

- `none`: `0px`
- `sm`: `4px`
- `md`: `8px`
- `lg`: `12px`
- `xl`: `16px`
- `full`: `9999px`

Usage guidance:
- Buttons use `8px`.
- Cards use `12px`.
- Pills and tags may use `9999px` for a compact esports UI.
- Avoid overly soft corners on primary surfaces; the brand reads as technical and sharp.

# Components

## Button
Primary and secondary buttons are the core conversion controls.

### Primary
- Background: `#6080ff`
- Text: `#ffffff`
- Radius: `8px`
- Min size: `189px × 38px`
- Padding: `13px 19px`
- Weight: `500`
- No border, no shadow

Use for: login, confirm, play, create lobby, make a prediction.

### Secondary
- Transparent background
- Text and affordance: `#6080ff`
- Same sizing as primary
- Use for non-destructive alternate actions

### Link
- Underlined white text
- Minimal padding
- Use only for inline legal, helper, or breadcrumb-style actions

## Card
Cards are the primary browsing surface.

- Background: `#131b2e`
- Border: `2px solid #6080ff`
- Radius: `12px`
- Padding: `24px 16px`
- Text: white
- Shadow: none

Use cards for:
- Game mode entry points
- Promotional modules
- Login/feature prompts
- Prediction or event highlights

Card content pattern:
- Large background image or illustration
- Upper or lower title lockup
- Small in-game count or status metadata
- Optional badge in accent color

## Navigation chips
Not explicitly tokenized, but observed in the UI as compact rounded filters.

- Use dark surfaces with subtle contrast.
- Highlight active chips with the primary accent.
- Keep labels short and uppercase where appropriate.

## Alerts and banners
- Use a warm dark strip or panel for announcement banners.
- Keep the message concise and action-oriented.
- Pair with a single inline link or CTA when needed.

## Modals and popovers
- Use darker blue surfaces with clear borders or contrast.
- Include a close icon in the top-right corner.
- Keep primary action large and obvious.

## Floating chat / support action
- Fixed circular blue action button at the viewport edge.
- Use it for support or messaging entry.
- Keep it visually distinct but not more prominent than primary CTAs.

# Do's and Don'ts

## Do
- Do use `#11141c` for the page background and `#131b2e` for interactive surfaces.
- Do keep all primary CTAs blue, large, and high contrast.
- Do prefer Roboto with bold weights for navigation, labels, and counts.
- Do organize the interface around a left sidebar and a dense content grid.
- Do use flat depth, relying on borders and contrast instead of shadows.
- Do make server cards image-forward with concise titles and small status counts.
- Do keep copy short and action-led: “Play”, “Login”, “Create lobby”, “Confirm”.
- Do use rounded 8–12px geometry for buttons and cards.

## Don't
- Don't introduce bright light backgrounds or airy whitespace-heavy layouts.
- Don't use drop shadows as a primary depth cue.
- Don't mix in decorative serif or display fonts.
- Don't make body copy long or paragraph-heavy inside cards.
- Don't rely on thin text weights for key labels or counts.
- Don't add multiple competing accent colors; blue should remain dominant.
- Don't over-round surfaces beyond the established card and button radii.
- Don't obscure CTA hierarchy with equally weighted secondary actions.