---
name: GPU blur isolation gotcha
description: Fixing "blur bleeding onto sharp text" by forcing a GPU compositing layer (translateZ(0)/will-change/backface-visibility) can itself cause blur, on a different class of elements.
---

## The rule
When isolating a `backdrop-blur`/`filter: blur()` element so it can't visually bleed onto sibling foreground text, use `isolation: isolate` + `contain: paint` only. Do NOT also force `transform: translateZ(0)`, `will-change: transform`, or `backface-visibility: hidden` as a blanket utility class.

**Why:** That older "GPU hack" triad permanently promotes the element to its own compositor layer. On any card that combines `border-radius` + `overflow-hidden` + a blur filter, Chromium/Android GPU drivers can rasterize that layer's rounded clip at a slightly different pixel grid than the rest of the page, softening the whole layer — including sharp SVG/text painted inside it. This reproduced as a second, distinct "still blurry" bug on exactly one card (a rounded, overflow-hidden, backdrop-blurred panel) after an initial isolation-only pass had already fixed the original cross-layer bleed everywhere else.

**How to apply:** If a user reports blur persisting on one specific rounded/clipped glass card after a general blur-isolation fix, suspect the forced-compositing part of the fix itself, not a missed occurrence. Drop translateZ/will-change/backface-visibility from the shared utility class and keep only isolation + contain: paint.
