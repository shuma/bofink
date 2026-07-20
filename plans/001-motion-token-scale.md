# 001 — Add a motion token scale (easing + duration)

- **Status**: TODO
- **Commit**: f2cc33d
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens (foundational)
- **Estimated scope**: 1 file (`src/app/globals.css`), ~15 lines added

## Problem

The app has **no shared motion tokens**. Every component hand-types its own
duration and easing, and they don't agree with each other. Durations found in
the codebase: `duration-100`, `duration-150`, `duration-200`, `duration-300`.
Easings found: `ease-out`, `ease-linear`, and the Tailwind default. There is no
single source of truth, so the later plans (002–005) would each invent their own
values.

`src/app/globals.css` defines many design tokens (colors, shadows, gradients in
the `:root` block starting at line 53) but **not one motion token**:

```css
/* src/app/globals.css:108 — current, no motion tokens exist */
  /* === Design Tokens === */

  /* Switch Component */
  --_switch-shadow-track: ...
```

## Target

Add a motion token block to `:root` in `globals.css`, using the exact curves and
a duration scale that fits this app's calm, crisp personality. These become the
vocabulary the other plans reference.

```css
/* target — add inside :root, alongside the other design tokens */

  /* === Motion === */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI enter/exit */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* strong ease-in-out for on-screen movement */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like sidebar/drawer curve */
  --duration-fast: 120ms;    /* button press, hover feedback */
  --duration-base: 180ms;    /* dropdowns, inputs, most UI */
  --duration-slow: 240ms;    /* sidebar, larger surfaces */
```

These are plain CSS custom properties. Consumers reference them with Tailwind
arbitrary-value syntax, e.g. `ease-[var(--ease-out)]` and
`duration-[var(--duration-base)]`, or in raw CSS as `var(--ease-out)`.

## Repo conventions to follow

- All design tokens live in the `:root` block of `src/app/globals.css`
  (lines 53–142), grouped with a `/* === Section === */` comment header — see the
  `/* === Design Tokens === */` header at line 108 and the `/* Switch Component */`
  and `/* Button Shadows */` sub-groups. Add the motion block the same way.
- Tokens are consumed both as raw `var(--token)` and via Tailwind arbitrary
  values elsewhere in the codebase.
- Do **not** register these under Tailwind's `@theme inline` block (lines 9–51) —
  that would override the built-in `ease-out`/`duration-*` utilities globally and
  is out of scope. Keep them as plain `:root` custom properties.

## Steps

1. Open `src/app/globals.css`. Find the end of the `:root` block — the
   `--bg-depth` line at line 141, immediately before the closing `}` at line 142.
2. Insert the `/* === Motion === */` block shown in **Target** just before that
   closing `}`, so it sits with the other design tokens.
3. Do not change any existing token. Do not add dark-mode overrides — easing and
   duration are theme-independent.

## Boundaries

- Do NOT touch any component file. This plan only adds tokens; plans 002–005 wire
  them in.
- Do NOT modify the `@theme inline` block or override built-in Tailwind easing
  utilities.
- Do NOT add dark-mode (`.dark`) variants of these tokens.
- Do NOT add new dependencies.
- If the `:root` block or `--bg-depth` line doesn't match what you find (drift
  since commit f2cc33d), STOP and report instead of improvising.

## Verification

- **Mechanical**: run `npm run build` (or `npx next build`) — it must compile with
  no new errors. The tokens are unused by any selector yet, which is expected.
- **Feel check**: none yet — this plan adds no visible motion on its own. In
  DevTools, inspect `:root` in the Elements → Computed/Styles panel and confirm
  `--ease-out`, `--duration-base`, etc. resolve to the values above.
- **Done when**: the six motion custom properties appear in `:root` in
  `globals.css` and the build passes.
