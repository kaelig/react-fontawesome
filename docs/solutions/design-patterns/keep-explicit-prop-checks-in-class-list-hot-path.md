---
title: Keep explicit prop checks in the class-list hot path
date: 2026-10-13
category: design-patterns
module: src/utils/get-class-list-from-props
problem_type: design_pattern
component: frontend
severity: medium
applies_when:
  - Refactoring getClassListFromProps, which runs on every render of every FontAwesomeIcon
  - Replacing a run of if/push lines with a lookup table or a loop over prop names
  - Judging whether a readability-only refactor in a per-icon code path is free
tags: [performance, v8, class-list, hot-path, benchmark, inline-cache]
---

# Keep explicit prop checks in the class-list hot path

## Context

`getClassListFromProps` maps about 25 boolean props to CSS classes for every rendered icon. It destructures the props once, then runs one `if (prop) result.push(CLASS)` line per prop (`src/utils/get-class-list-from-props.ts:40-129`). That run of near-identical lines looks like an obvious candidate for a table: an ordered list of `[propName, className]` pairs, walked in one loop.

During a measured optimization pass on this function (plan: `docs/plans/2026-10-13-2115-perf-class-list-benchmark-loop-plan.md`), that table rewrite was tried, benchmarked, and reverted. The final code keeps the `if` chain and records nothing about why, so the rewrite will look like a free clean-up to the next person who reads it.

## Guidance

Keep one named property read and one `if` per prop. Do not replace the chain with a loop that reads `props[key]` for each entry in a table of prop names.

Measured with `npm run bench` in interleaved A/B runs (old, new, old, new, old, new; median of three per side) on Node 24:

| Scenario                              | `if` chain (ns/call) | table + `props[key]` (ns/call) |
| ------------------------------------- | -------------------- | ------------------------------ |
| plain icon                            | 13.4                 | 252.7                          |
| styled icon                           | 42.8                 | 282.7                          |
| page mix (~1,000 icons, mixed shapes) | 70.1                 | 287.8                          |
| headline (geometric mean, 6 cases)    | 66.1                 | 335.1 (80% slower)             |

The likely cause is V8's inline caches; this explanation is inferred from the numbers, and the session did not trace inline-cache states. Each named read such as `props.spin` is its own call site, sees one property name, and stays on the fast path. A single `props[key]` site sees about 25 different names, so its cache goes megamorphic and every lookup takes the generic path.

## Why This Matters

The cost is paid per icon, per render. Output stays identical, so every test passes and only a benchmark reveals the slowdown. At the measured rate the plain-icon case went from roughly 13 ns to 250 ns. That is still small next to the ~6 µs an icon takes to render, but it erases every gain the class-list work produced and then some.

## When to Apply

- Any change to how `getClassListFromProps` reads props or maps them to classes.
- Any "tidy this into a table" refactor of a function that runs once per rendered icon.

Changes that did help in the same pass removed allocations or repeated work without changing how props are read:

- building the custom-prefix `RegExp` once instead of once per class (about 10% on the headline);
- rewriting the joined class list once instead of each class (about 7%);
- starting the result array from `className.split(' ')` instead of spreading it into a new array (about 2%, an idea taken from clsx's habit of avoiding intermediate arrays).

## Examples

Kept:

```ts
const { beat, fade /* … */, className } = props

const result = className ? className.split(' ') : []

if (beat) result.push(ANIMATION_CLASSES.beat)
if (fade) result.push(ANIMATION_CLASSES.fade)
// … one line per boolean prop
```

Rejected after measurement:

```ts
const BOOLEAN_CLASSES: [keyof FontAwesomeIconProps, string][] = [
  ['beat', ANIMATION_CLASSES.beat],
  ['fade', ANIMATION_CLASSES.fade],
  // …
]

for (const [prop, cls] of BOOLEAN_CLASSES) {
  if (props[prop]) result.push(cls)
}
```

To test a future candidate the same way, run `npm run bench` alternately on the old and new code (at least three runs each) and compare the median `headline` lines. On unchanged code, back-to-back headlines agreed within about 2%, so a difference smaller than that is noise.
