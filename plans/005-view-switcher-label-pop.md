# 005 — Fix the view-switcher pill: label pop + `transition-all`

- **Status**: TODO
- **Commit**: f2cc33d
- **Severity**: MEDIUM
- **Category**: Physicality / Cohesion
- **Estimated scope**: 2 files, 3 edits each (6 total)
- **Depends on**: 001 (motion token scale) — uses `--ease-in-out`, `--duration-base`

## Problem

The segmented view switcher (Preview / Build Logs / Code) grows the active button
into a labeled pill. Two issues:

1. Each button uses `transition-all`, which animates `width` (and everything else)
   with no scoped property list.
2. The text label is **conditionally rendered** — `{activeTab === 'preview' &&
   <span>Preview</span>}` — so it appears **instantly** the same frame the pill
   *starts* growing. Result: the label pops in fully-formed while the pill is still
   mid-expansion. The morph and the label are out of sync, which reads as a small
   glitch on a control users hit constantly while building.

Current code (identical in both files):

```tsx
/* src/components/pluto/build-workspace.tsx:366 (also :382, :398) — current */
'flex items-center justify-center rounded-full text-sm font-medium transition-all',
activeTab === 'preview'
  ? 'view-switcher-pill gap-2 h-8 px-3'
  : 'h-8 w-8 text-muted-foreground hover:text-foreground'
...
<Globe className="h-4 w-4 shrink-0" />
{activeTab === 'preview' && <span>Preview</span>}
```

```tsx
/* src/app/projects/demo/page.tsx:417 (also :433, :449) — current, same pattern */
```

## Target

Two changes per button:

**(a) Scope the transition** so the pill morph is an explicit, eased width/color
change instead of `transition-all`:

```tsx
/* replace the transition token on each button */
'flex items-center justify-center rounded-full text-sm font-medium transition-[width,background-color,color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-in-out)]',
```

(`ease-in-out` because the pill is *morphing on screen*, not entering/exiting —
per the easing decision order. `--duration-base` = 180ms.)

**(b) Ease the label in** so it fades/slides in as the pill grows instead of
popping. Wrap the conditional label with a `tw-animate-css` enter animation
(these classes are already used throughout the repo — see `build-log.tsx:102`):

```tsx
/* replace each  {activeTab === 'preview' && <span>Preview</span>}  with: */
{activeTab === 'preview' && (
  <span className="animate-in fade-in-0 slide-in-from-left-1 duration-[var(--duration-base)] ease-[var(--ease-out)]">
    Preview
  </span>
)}
```

Apply the same pattern to the `logs` label (`Build Logs`) and the `code` label
(`Code`) in both files, matching each button's own `activeTab` value.

## Repo conventions to follow

- `tw-animate-css` enter classes (`animate-in fade-in-0 slide-in-from-*
  duration-* ease-*`) are the established way to animate mounts in this codebase —
  exemplar: `src/components/pluto/build-log.tsx:102`
  (`animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out`).
- Motion tokens are referenced via Tailwind arbitrary values,
  `duration-[var(--…)]` / `ease-[var(--…)]` (added in plan 001).
- The two files are structurally identical for this control — apply the exact same
  edits to both so they stay in sync.

## Steps

1. Confirm plan 001 landed (`--ease-in-out`, `--ease-out`, `--duration-base` exist
   in `globals.css`). If not, STOP.
2. `src/components/pluto/build-workspace.tsx`:
   - Lines 366, 382, 398 — replace `transition-all` with
     `transition-[width,background-color,color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-in-out)]`.
   - Lines 374, 390, 406 — wrap the conditional `<span>` label with the
     `animate-in` classes from **Target (b)**, keeping each label's text
     (`Preview`, `Build Logs`, `Code`) and its `activeTab` guard.
3. `src/app/projects/demo/page.tsx`:
   - Lines 417, 433, 449 — same transition replacement as step 2.
   - Lines 425, 441, 457 — same label wrap as step 2.

## Boundaries

- Do NOT change the `view-switcher-pill` / `view-switcher-track` /
  `view-switcher-divider` CSS in `globals.css` (lines 239–275) — the pill styling
  is intentional; only the button's transition and the label mount animation
  change.
- Do NOT change the `h-8 w-8` ↔ `h-8 px-3` size classes or the icons.
- Do NOT touch the fourth "Layers" button (it has no label/pill).
- Do NOT add new dependencies (`tw-animate-css` is already imported in
  `globals.css:2`).
- If the quoted lines don't match (drift since commit f2cc33d), STOP and report.

## Verification

- **Mechanical**: `npm run build` compiles clean.
  `grep -n "transition-all" src/components/pluto/build-workspace.tsx src/app/projects/demo/page.tsx`
  should no longer show the view-switcher lines.
- **Feel check**: run the app, open a project build view (and the `/projects/demo`
  page), and click between Preview / Build Logs / Code repeatedly:
  - The pill should **grow smoothly and the label should fade + slide in together**
    with the expansion — no instant text pop ahead of the morph.
  - In DevTools Animations panel at 10% speed, confirm the label's opacity ramps up
    over the same window the pill widens, not before it.
  - Rapidly toggle tabs — the width morph should retarget without visible restart
    (CSS transition), and labels should not stutter.
  - With `prefers-reduced-motion: reduce` (after plan 002), the label should just
    appear and the pill resize should be near-instant — no slide.
- **Done when**: switching tabs feels like one cohesive morph in both files, and no
  `transition-all` remains on the view-switcher buttons.
