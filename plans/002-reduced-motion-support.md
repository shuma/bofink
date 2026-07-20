# 002 — Add global `prefers-reduced-motion` support

- **Status**: TODO
- **Commit**: f2cc33d
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file (`src/app/globals.css`), ~12 lines added

## Problem

The app has **zero `prefers-reduced-motion` handling** — a repo-wide grep for
`prefers-reduced-motion`, `motion-reduce`, and `motion-safe` returns nothing. Every
animation runs for users who have explicitly asked their OS to reduce motion:

- All `tw-animate-css` enter/exit animations on dialogs, dropdowns, selects,
  tooltips, hover-cards (`data-open:animate-in`, `zoom-in-95`, `slide-in-from-*`).
- The sidebar width/position transitions (`src/components/ui/sidebar.tsx:221,233`).
- Global smooth scrolling — `html { scroll-smooth }` is applied unconditionally:

```css
/* src/app/globals.css:208 — current */
  html {
    @apply font-sans scroll-smooth;
  }
```

Reduced motion is an accessibility requirement (vestibular disorders, motion
sickness). The correct behavior is **fewer and gentler animations, not zero** —
keep opacity/color feedback, drop movement and scaling.

## Target

Add one global `@media (prefers-reduced-motion: reduce)` block at the end of
`src/app/globals.css`. It (a) turns off smooth scrolling, and (b) collapses every
transition/animation to near-instant so movement and scale are effectively
removed while state still changes:

```css
/* target — append to the end of src/app/globals.css */

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This is the widely-used baseline. It preserves *end states* (opacity, color,
final position) — elements still appear/disappear and change color — but removes
the animated travel, zoom, and slide that trigger motion sensitivity. Existing
`animate-spin` loaders are the one intentional exception; a spinner with a 0.01ms
duration effectively freezes, which is acceptable and preferable to spinning for
a reduced-motion user (it still conveys "busy" via its presence).

## Repo conventions to follow

- `globals.css` keeps utility/behavior blocks (e.g. `.main-scroll`,
  `.scrollbar-none`, the `@keyframes blink`, the resizable-panel rules at
  lines 277–293) below the `@layer base` block. Append this media query at the
  very bottom of the file, after the resize-handle rules (line 293).
- The file already uses global selectors under `@layer base` (`* { @apply ... }`
  at line 198), so a global reset here matches existing style.

## Steps

1. Open `src/app/globals.css`.
2. Append the `@media (prefers-reduced-motion: reduce)` block from **Target** to
   the end of the file (after the current final rule at line 290–292).
3. Leave `html { @apply font-sans scroll-smooth; }` at line 208 unchanged — the
   media query's `scroll-behavior: auto` override handles the reduced-motion case
   without removing smooth scroll for everyone else.

## Boundaries

- Do NOT edit any component file — this is a single global CSS addition.
- Do NOT remove `scroll-smooth` from the base `html` rule.
- Do NOT delete or gut individual component animations; the global override is
  intentionally broad and reversible.
- Do NOT add new dependencies.
- If the resize-handle rules at the end of `globals.css` don't match what you find
  (drift since commit f2cc33d), STOP and report — just append the block at the
  true end of the file.

## Verification

- **Mechanical**: `npm run build` compiles with no new errors.
- **Feel check**: run the app. In Chrome DevTools open the **Rendering** panel and
  set **Emulate CSS media feature prefers-reduced-motion → reduce**, then:
  - Open a dropdown / dialog / the command surfaces — they should **appear without
    zoom or slide**, essentially cutting in with at most a faint opacity change.
  - Toggle the sidebar (⌘B) — it should snap open/closed with no width glide.
  - Anchor-scroll anything — no smooth-scroll animation.
  - Switch the emulation **off** and confirm all animations return to normal.
- **Done when**: with reduced-motion emulated, no element visibly slides, zooms, or
  glides, but content still updates and opacity feedback remains; with it off,
  behavior is unchanged from before.
