# 003 — Replace `transition-all` with scoped transition properties

- **Status**: TODO
- **Commit**: f2cc33d
- **Severity**: MEDIUM
- **Category**: Performance / Cohesion
- **Estimated scope**: 6 files, one class-string edit each

## Problem

Multiple core UI primitives use `transition-all`, which animates **every**
changed property — including layout properties (`width`, `padding`) that run
off-GPU and cause paint/layout, and properties the author never intended to
animate. Emil's rule: never `transition: all`; name the properties you mean.

Current occurrences (each is the only `transition-*` on the element):

```tsx
/* src/components/ui/button.tsx:7 — current */
"group/button inline-flex shrink-0 ... whitespace-nowrap transition-all duration-200 outline-none select-none ..."

/* src/components/ui/input.tsx:15 — current */
"transition-all duration-200 outline-none"

/* src/components/ui/switch.tsx:15 — current */
"transition-all duration-200 ease-out"

/* src/components/ui/input-group.tsx:22 — current */
"group/input-group relative flex w-full min-w-0 items-center transition-all duration-200 outline-none"

/* src/components/ui/badge.tsx:8 — current */
"group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:..."

/* src/components/ui/accordion.tsx:36 — current */
"group/accordion-trigger relative flex flex-1 items-start justify-between rounded-md border border-transparent py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:..."
```

## Target

Replace each `transition-all` with an explicit property list covering exactly
what these elements actually change on hover / focus / active / state — colors,
box-shadow (rings/shadows), and transform (the button's `active:scale-[0.98]`,
the switch thumb). Keep the existing `duration-*` where present.

| File:line | Replace | With |
| --- | --- | --- |
| `button.tsx:7` | `transition-all duration-200` | `transition-[color,background-color,box-shadow,transform] duration-200` |
| `input.tsx:15` | `transition-all duration-200` | `transition-[color,box-shadow,border-color] duration-200` |
| `switch.tsx:15` | `transition-all duration-200 ease-out` | `transition-[background-color,box-shadow] duration-200 ease-out` |
| `input-group.tsx:22` | `transition-all duration-200` | `transition-[color,box-shadow,border-color] duration-200` |
| `badge.tsx:8` | `transition-all` | `transition-[color,background-color,box-shadow]` |
| `accordion.tsx:36` | `transition-all` | `transition-colors` |

Notes:
- `switch.tsx` line 15 is the **track**; its thumb already uses
  `transition-transform` at line 30 — leave the thumb alone.
- `accordion.tsx` trigger only changes color/underline on hover/focus, so
  `transition-colors` is sufficient; the chevron icon rotation (if any) is a
  separate element and out of scope.
- `button.tsx` keeps `transform` in the list because it has
  `active:not-aria-[haspopup]:scale-[0.98]` (line 7) — that press feedback must
  still animate.

## Repo conventions to follow

- These are all `cva`/`cn` class strings in shadcn-style primitives under
  `src/components/ui/`. Edit only the transition token inside the string; leave
  every other class in place and in order.
- Scoped transitions are already used correctly elsewhere in the repo — e.g.
  `src/components/pluto/project-card.tsx:72` uses `transition-shadow duration-150`
  and `src/components/pluto/file-tree.tsx:214` uses `transition-colors`. Match
  that style.

## Steps

1. `src/components/ui/button.tsx` line 7 — swap the token per the table.
2. `src/components/ui/input.tsx` line 15 — swap per the table.
3. `src/components/ui/switch.tsx` line 15 — swap per the table (do not touch
   line 30).
4. `src/components/ui/input-group.tsx` line 22 — swap per the table.
5. `src/components/ui/badge.tsx` line 8 — swap per the table.
6. `src/components/ui/accordion.tsx` line 36 — swap per the table.

Each edit changes only the `transition-all[...]` fragment; keep `duration-*`,
`ease-*`, and all other classes exactly as they are.

## Boundaries

- Do NOT change durations or easings (except removing `all`); those are handled by
  other plans.
- Do NOT touch the switch thumb transition (`switch.tsx:30`).
- Do NOT touch the demo-page or build-workspace view-switcher `transition-all`
  usages — those are handled by plan 005.
- Do NOT add or remove any non-transition class.
- Do NOT add new dependencies.
- If any quoted class string doesn't match what you find (drift since commit
  f2cc33d), STOP and report that file instead of guessing the replacement.

## Verification

- **Mechanical**: `npm run build` compiles clean. Grep to confirm none of the six
  files still contain the bare token:
  `grep -rn "transition-all" src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/switch.tsx src/components/ui/input-group.tsx src/components/ui/badge.tsx src/components/ui/accordion.tsx`
  should return nothing.
- **Feel check**: run the app and exercise each primitive:
  - Hover and focus a **Button**; press it — the `scale-[0.98]` press must still
    animate, and hover color/shadow must still transition (no snap).
  - Focus an **Input** and an **InputGroup** — the focus ring should still ease in.
  - Toggle a **Switch** — track color still animates, thumb still slides.
  - Hover a **Badge** and expand an **Accordion** — color transitions still smooth.
  - In DevTools Animations panel at 10% speed, confirm nothing *else* now animates
    unexpectedly (e.g. layout width) that used to.
- **Done when**: all six primitives feel identical or better on hover/focus/press,
  and no `transition-all` remains in those files.
