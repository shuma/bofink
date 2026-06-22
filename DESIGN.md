---
name: Pluto
description: AI-powered web app builder
colors:
  pluto-blue: "lab(31.7736 30.003 -75.3703)"
  soft-cream: "oklch(0.985 0.003 85)"
  warm-white: "oklch(0.995 0.002 85)"
  ink-slate: "oklch(0.25 0.015 260)"
  quiet-mute: "oklch(0.5 0.02 260)"
  soft-border: "oklch(0.91 0.008 80)"
  warm-secondary: "oklch(0.96 0.008 80)"
  soft-red: "oklch(0.62 0.2 25)"
  success-green: "oklch(0.65 0.15 145)"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  2xl: "1.25rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.pluto-blue}"
    textColor: "white"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  button-secondary:
    backgroundColor: "{colors.warm-secondary}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.soft-cream}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  view-switcher:
    trackBackground: "oklch(0.965 0.003 265)"
    pillBackground: "lab(31.7736 30.003 -75.3703)"
    pillText: "white"
    rounded: "{rounded.full}"
---

# Design System: Pluto

## 1. Overview

**Creative North Star: "The Capable Partner"**

A skilled pair programmer sitting beside you. Not flashy AI theater. Not a simple chatbot. A focused tool that understands intent and executes cleanly. The interface stays out of the way so you can focus on what you're building.

The system draws from PRODUCT.md's personality: capable, precise, collaborative. It rejects overhyped AI demos, restrictive no-code builders, and generic chat interfaces. Instead, it offers efficiency without coldness, power without complexity.

Every element serves the build. The preview is the hero. The conversation drives progress. The chrome disappears.

**Key Characteristics:**
- Clean, tool-like aesthetic
- Blue accent for active states and primary actions
- Warm neutrals to reduce harshness during long sessions
- Compact, information-dense where needed
- Clear visual hierarchy between builder chrome and preview content

## 2. Colors

A restrained palette anchored by Pluto Blue and warm neutrals. Blue signals active states and primary actions; everything else recedes.

### Primary

- **Pluto Blue** (lab(31.7736 30.003 -75.3703)): Active tabs, primary buttons, progress indicators. A rich, saturated blue that commands attention.

### Neutral

- **Soft Cream** (oklch(0.985 0.003 85)): Page background. Warmer than pure white, easier on eyes during extended use.
- **Warm White** (oklch(0.995 0.002 85)): Card backgrounds, elevated surfaces, preview chrome.
- **Ink Slate** (oklch(0.25 0.015 260)): Primary text. Not pure black; carries a hint of warmth.
- **Quiet Mute** (oklch(0.5 0.02 260)): Secondary text, labels, inactive states.
- **Soft Border** (oklch(0.91 0.008 80)): Dividers, input borders, subtle separations.
- **Warm Secondary** (oklch(0.96 0.008 80)): Secondary backgrounds, hover states.

### Semantic

- **Soft Red** (oklch(0.62 0.2 25)): Errors, destructive actions.
- **Success Green** (oklch(0.65 0.15 145)): Success states, completion indicators.

### Named Rules

**The Restrained Rule.** Pluto Blue appears on active states and primary actions only. Most of the interface is neutral.

**The Tinted Neutral Rule.** No pure white or pure black. Every neutral carries subtle warmth.

## 3. Typography

**Display Font:** Figtree (with system-ui fallback)
**Body Font:** Inter (with system-ui fallback)
**Mono Font:** JetBrains Mono (for code, logs, technical content)

**Character:** Figtree brings friendly geometry to headings. Inter provides neutral clarity for body text. JetBrains Mono for anything technical. Together they say "capable tool," not "enterprise software."

### Hierarchy

- **Display** (600, 1.5rem, 1.2): Page titles, major headers. Used sparingly.
- **Headline** (600, 1.125rem, 1.25): Section headers, card titles.
- **Title** (500, 0.9375rem, 1.3): Subsections, list headers.
- **Body** (400, 0.875rem, 1.5): All paragraph text, descriptions.
- **Label** (500, 0.75rem, 1.4): Input labels, metadata, timestamps.
- **Mono** (400, 0.8125rem, 1.5): Code, logs, file paths, technical output.

## 4. Elevation

Flat by default. Shadows appear on interaction or to separate distinct contexts (preview from builder).

### Shadow Vocabulary

- **Hover lift:** Subtle upward movement on interactive cards.
- **Focus ring:** Blue glow (3px, 40% opacity) on focused elements.
- **Preview frame:** Subtle shadow to separate preview content from builder chrome.

## 5. Components

### View Switcher

The tab bar for switching between Preview, Build Logs, and other views.

- **Track:** Light gray background, fully rounded, subtle border.
- **Active pill:** Pluto Blue background, white text/icon, fully rounded.
- **Inactive:** Icon only, muted color, no background.
- **Dividers:** 1px vertical lines between icon buttons.

### Buttons

- **Primary:** Pluto Blue background, white text. 0.75rem radius.
- **Secondary:** Warm Secondary background, Ink Slate text.
- **Ghost:** Transparent, Ink Slate text. Hover reveals background.

### Chat/Prompt Input

- **Container:** Rounded corners, subtle border, cream background.
- **Focus:** Blue ring appears on focus.
- **Actions:** Icon buttons for attachments, voice, submit.

### Preview Frame

- **Frame:** Rounded corners, subtle shadow to lift from page.
- **Chrome:** Minimal: URL bar, refresh, external link. Recedes visually.
- **Loading:** Skeleton or subtle spinner, no blocking overlays.

### Build Logs

- **Container:** Monospace font throughout.
- **Entries:** Color-coded by type (info, command, output, error).
- **Scrolling:** Auto-scroll to bottom during active builds.

## 6. Do's and Don'ts

### Do:

- **Do** keep the preview as the visual hero. Builder chrome should recede.
- **Do** use Pluto Blue sparingly: active states, primary actions, progress.
- **Do** maintain compact, efficient layouts. This is a tool, not a marketing page.
- **Do** use monospace for all technical content (logs, paths, code).
- **Do** show build progress clearly. Users should always know what's happening.

### Don't:

- **Don't** use pure black or pure white. Use tinted neutrals.
- **Don't** add decorative elements. Every pixel serves the build.
- **Don't** create flashy animations or loading sequences. Speed matters.
- **Don't** hide the technical details. Power users want to see logs and output.
- **Don't** use gradient text or glassmorphism.
- **Don't** add ambient shadows. Flat by default.
