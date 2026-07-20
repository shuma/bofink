# 004 — Replace `ease-linear` on the sidebar with a decelerating curve

- **Status**: TODO
- **Commit**: f2cc33d
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file (`src/components/ui/sidebar.tsx`), 2 class-string edits
- **Depends on**: 001 (motion token scale) — uses `--ease-drawer`

## Problem

The collapsible sidebar animates its width and position with **`ease-linear`**.
Linear easing has constant velocity — no acceleration or deceleration — so the
panel feels mechanical and robotic, exactly the wrong feel for a soft, calm
consumer app. The sidebar toggle (⌘B) is a frequently used, recently shipped
interaction, so this feel penalty is paid often.

```tsx
/* src/components/ui/sidebar.tsx:221 — current (the gap/spacer element) */
"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",

/* src/components/ui/sidebar.tsx:233 — current (the fixed sidebar panel) */
"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 ...",
```

(The transition **properties** here — `width`, `left`, `right` — are layout
properties, not `transform`. That is a known shadcn tradeoff for an auto-width
sidebar and is out of scope for this plan; do not attempt to rewrite it to
`transform`.)

## Target

Swap `ease-linear` for the iOS-like drawer curve token added in plan 001, and
lengthen slightly to the slow duration so the deceleration reads. Both edits use
Tailwind arbitrary-value syntax to reference the CSS custom properties.

```tsx
/* target — src/components/ui/sidebar.tsx:221 */
"relative w-(--sidebar-width) bg-transparent transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-drawer)]",

/* target — src/components/ui/sidebar.tsx:233 */
"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-[var(--duration-slow)] ease-[var(--ease-drawer)] data-[side=left]:left-0 ...",
```

Where the tokens (from plan 001, in `src/app/globals.css`) are:

```css
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like drawer curve */
--duration-slow: 240ms;
```

Only the `duration-*` and `ease-*` fragments change; every other class on each
line stays byte-for-byte identical.

## Repo conventions to follow

- The sidebar already varies its transition property list per element
  (`transition-[width]` vs `transition-[left,right,width]` vs
  `transition-[margin,opacity]` at line 403) — keep each element's property list
  as-is; only the easing/duration changes.
- Tokens are referenced from Tailwind classes via arbitrary values,
  `ease-[var(--…)]` / `duration-[var(--…)]`.
- Other transitions in this same file (lines 292, 403, 427, 478, 567) also use
  `ease-linear` or bare transitions, but those govern tiny margin/opacity/transform
  shifts on menu internals — **leave them out of scope**; this plan targets only
  the two panel-level width/position transitions users perceive as "the sidebar
  opening."

## Steps

1. Confirm plan 001 has landed and `--ease-drawer` + `--duration-slow` exist in
   `src/app/globals.css`. If they do not, STOP — this plan depends on 001.
2. `src/components/ui/sidebar.tsx` line 221 — replace
   `duration-200 ease-linear` with `duration-[var(--duration-slow)] ease-[var(--ease-drawer)]`.
3. `src/components/ui/sidebar.tsx` line 233 — replace
   `duration-200 ease-linear` with `duration-[var(--duration-slow)] ease-[var(--ease-drawer)]`.

## Boundaries

- Do NOT change the transition **property** lists (`width`, `left,right,width`) —
  no rewrite to `transform`.
- Do NOT touch the other `ease-linear` / transition usages in this file
  (lines 292, 403, 427, 478, 567).
- Do NOT alter the mobile `Sheet` sidebar variant (lines ~185–195).
- Do NOT add new dependencies.
- If lines 221/233 don't match the quoted strings (drift since commit f2cc33d),
  STOP and report.

## Verification

- **Mechanical**: `npm run build` compiles clean.
  `grep -n "ease-linear" src/components/ui/sidebar.tsx` should no longer show
  lines 221 or 233.
- **Feel check**: run the app, toggle the sidebar with ⌘B several times:
  - The panel should **start moving quickly and glide to a soft stop** (ease-out
    deceleration), not travel at constant speed.
  - Open DevTools Animations panel, set speed to 10%, toggle again, and confirm the
    end of the motion visibly slows down rather than stopping abruptly.
  - Toggle rapidly — because these are CSS transitions they should retarget
    smoothly mid-motion, never jumping to zero.
  - With `prefers-reduced-motion: reduce` emulated (after plan 002), the sidebar
    should snap with no glide.
- **Done when**: the sidebar open/close decelerates naturally and no `ease-linear`
  remains on lines 221/233.
