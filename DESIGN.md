---
name: Bolåneplaner
description: Swedish mortgage planning with calm confidence
colors:
  calm-blue: "oklch(0.6 0.18 250)"
  soft-cream: "oklch(0.985 0.003 85)"
  warm-white: "oklch(0.995 0.002 85)"
  ink-slate: "oklch(0.25 0.015 260)"
  quiet-mute: "oklch(0.5 0.02 260)"
  soft-border: "oklch(0.91 0.008 80)"
  warm-secondary: "oklch(0.96 0.008 80)"
  soft-red: "oklch(0.62 0.2 25)"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
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
rounded:
  sm: "calc(0.875rem * 0.6)"
  md: "calc(0.875rem * 0.8)"
  lg: "0.875rem"
  xl: "calc(0.875rem * 1.4)"
  2xl: "calc(0.875rem * 1.8)"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.calm-blue}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 0.625rem"
  button-primary-hover:
    backgroundColor: "oklch(0.54 0.16 250)"
  button-secondary:
    backgroundColor: "{colors.warm-secondary}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 0.625rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 0.625rem"
  card:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.2xl}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.soft-cream}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 0.75rem"
---

# Design System: Bolåneplaner

## 1. Overview

**Creative North Star: "The Financial Companion"**

A trusted friend at the kitchen table, helping you make sense of mortgage numbers. Not a banker behind a desk. Not a flashy app demanding attention. Just calm, competent guidance that respects both your time and your intelligence.

The system draws from PRODUCT.md's personality: calm, trustworthy, clear. It rejects the stiff corporate aesthetic of generic Swedish bank apps, the gamified neon of consumer fintech, and the overwhelming data density of financial dashboards. Instead, it offers warmth without casualness, clarity without oversimplification.

Every element serves the user's task. Numbers are readable. Actions are obvious. The interface fades into the background so the user can focus on their actual question: what does my mortgage really cost?

**Key Characteristics:**
- Warm cream backgrounds with soft blue accents
- Generous corner radii (14px base) for approachability
- Typography pairing: Figtree headings (friendly geometric) + Inter body (neutral clarity)
- Restrained color: one accent, used sparingly
- Flat surfaces that lift only on interaction

## 2. Colors

A restrained palette anchored by a trustworthy blue and warm, cream-tinted neutrals. The blue appears on primary actions and key data; everywhere else is quiet.

### Primary

- **Calm Blue** (oklch(0.6 0.18 250)): Primary buttons, active states, chart accents, links. Trustworthy without being corporate. Saturated enough to command attention, muted enough to feel calm.

### Neutral

- **Soft Cream** (oklch(0.985 0.003 85)): Page background. Warmer than pure white, reduces eye strain during extended use.
- **Warm White** (oklch(0.995 0.002 85)): Card backgrounds, elevated surfaces. The slight cream tint keeps it cohesive with the page.
- **Ink Slate** (oklch(0.25 0.015 260)): Primary text. Not pure black; carries a hint of blue for harmony with the primary accent.
- **Quiet Mute** (oklch(0.5 0.02 260)): Secondary text, labels, helper text. Readable but recessive.
- **Soft Border** (oklch(0.91 0.008 80)): Dividers, input borders, card rings. Visible but unobtrusive.
- **Warm Secondary** (oklch(0.96 0.008 80)): Secondary button backgrounds, hover states on ghost elements.

### Semantic

- **Soft Red** (oklch(0.62 0.2 25)): Destructive actions, error states. Muted rather than alarming; mortgages are stressful enough.

### Chart Palette

Five-step blue gradient for data visualization:
- Chart 1: oklch(0.82 0.1 250) (lightest)
- Chart 2: oklch(0.72 0.14 250)
- Chart 3: oklch(0.62 0.17 250)
- Chart 4: oklch(0.52 0.18 250)
- Chart 5: oklch(0.45 0.18 250) (darkest)

### Named Rules

**The Restrained Rule.** The primary blue appears on 10% or less of any given screen. Its rarity is what makes it meaningful. If everything is blue, nothing is.

**The Tinted Neutral Rule.** No pure white (#fff) or pure black (#000). Every neutral carries a subtle warm tint (hue 80-85) to maintain visual cohesion.

## 3. Typography

**Display Font:** Figtree (with system-ui, sans-serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)
**Mono Font:** JetBrains Mono (for code, if needed)

**Character:** Figtree brings friendly geometry to headings: approachable without being playful. Inter in the body is invisible in the best way: highly legible, zero personality interference. Together they say "competent friend," not "corporate bank."

### Hierarchy

- **Display** (600, clamp(1.75rem, 3vw, 2.25rem), 1.1): Reserved for page titles and hero moments. Tight tracking (-0.02em).
- **Headline** (600, 1.25rem, 1.2): Section headers, card titles when emphasis needed. Slight negative tracking (-0.01em).
- **Title** (500, 1rem, 1.3): Card titles, list headers. Medium weight distinguishes from body.
- **Body** (400, 0.875rem, 1.5): All paragraph text, descriptions, explanations. Max line length 65-75ch.
- **Label** (500, 0.75rem, 1.4): Input labels, table headers, metadata. Slight positive tracking (0.01em) for readability at small sizes.

### Named Rules

**The Quiet Hierarchy Rule.** Weight and scale create hierarchy; color does not. Avoid blue headings or colorful labels. Let the type scale do the work.

## 4. Elevation

Flat by default. Surfaces rest without shadows at their base state. Depth emerges through interaction: cards lift on hover, inputs deepen on focus. This keeps the interface calm until the user engages.

### Shadow Vocabulary

- **Hover lift** (box-shadow: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)): Cards on hover. Subtle upward movement effect.
- **Focus ring** (ring: 3px, ring-color: oklch(0.6 0.15 250 / 0.4)): Inputs and buttons on focus. Blue glow signals active state without harsh outlines.

### Named Rules

**The Flat-By-Default Rule.** Shadows appear only as a response to user interaction. At rest, the interface is flat. Ambient shadows are prohibited.

## 5. Components

### Buttons

- **Shape:** Generously rounded (12px radius on default size, scaling with button size)
- **Primary:** Calm Blue background, warm white text. Padding 0.5rem vertical, 0.625rem horizontal.
- **Hover / Focus:** Background darkens to oklch(0.54 0.16 250). Focus adds 3px blue ring at 40% opacity.
- **Secondary:** Warm Secondary background, Ink Slate text. Same shape and padding.
- **Ghost:** Transparent background, Ink Slate text. Hover reveals Warm Secondary background.
- **Destructive:** Soft Red at 10% opacity background, Soft Red text. Hover deepens to 15%.

### Badges / Chips

- **Style:** Fully rounded (border-radius: 9999px), 20px height
- **Default:** Calm Blue background, white text
- **Secondary:** Warm Secondary background, Ink Slate text
- **Outline:** Transparent with border, Ink Slate text

### Cards

- **Corner Style:** 2xl radius (approximately 25px)
- **Background:** Warm White
- **Shadow Strategy:** None at rest; subtle lift on hover per Elevation rules
- **Border:** 1px ring at 50% border color opacity
- **Internal Padding:** 24px (6 spacing units), 16px for compact variant

### Inputs

- **Style:** 1px border (Soft Border at 80% opacity), Soft Cream background, xl radius (12px)
- **Focus:** Border shifts to Calm Blue, adds 3px ring at 40% opacity
- **Error:** Border and ring shift to Soft Red
- **Height:** 40px default, 36px for compact contexts

### Navigation

The primary navigation is a chat-based sidebar (400px wide) with the content area beside it. No traditional nav bar; the AI conversation IS the navigation.

- **Sidebar background:** Warm White (matches cards)
- **Active state:** Items use Warm Secondary background
- **Typography:** Body size for messages, Label size for metadata

## 6. Do's and Don'ts

### Do:

- **Do** use the primary Calm Blue sparingly: buttons, links, chart accents. Limit to 10% of screen area.
- **Do** maintain the warm tint in all neutrals. Test by comparing against pure white; the difference should be visible.
- **Do** use Figtree for headings and Inter for body text. Don't mix their roles.
- **Do** add hover shadows to cards. The lift signals interactivity.
- **Do** use generous corner radii. The 14px base radius is intentional; smaller radii feel corporate.
- **Do** let numbers breathe. Financial data needs whitespace to be scannable.

### Don't:

- **Don't** use pure black or pure white. Always use the tinted neutrals (Ink Slate, Soft Cream, Warm White).
- **Don't** mimic generic Swedish bank apps: stiff layouts, excessive form fields, hierarchical menu trees, corporate blue-and-white schemes.
- **Don't** add gamification, neon colors, or playful animations. This is not Klarna. Mortgages are serious.
- **Don't** create dense financial dashboards with multiple charts competing for attention. Show one insight at a time.
- **Don't** use border-left or border-right as colored accent stripes on cards or alerts.
- **Don't** use gradient text or glassmorphism.
- **Don't** use ambient shadows. Surfaces are flat until interaction.
- **Don't** use em dashes in copy. Use commas, colons, semicolons, or periods.
