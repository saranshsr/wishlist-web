# noon — Wishlist · collection-switch motion

A recreation of the noon desktop wishlist page (Figma file `bGeam4dYWnlJLz0uJ91DdQ`,
panel frame `419:535726`) with a live saved-items panel in the middle, built to
review **four collection-switch transitions** side by side.

The page chrome (top nav, category bar, list switcher, help band, footer) is
static. Only the panel is interactive.

## The four versions

Switch with the dark pill at the bottom of the page, the `1`–`4` keys, or
`←` / `→`. The choice is kept in the URL (`?v=1` … `?v=4`), so a link opens on
a specific version.

| | Version | What moves | Feel |
| --- | --- | --- | --- |
| V1 | **Unfurl** | Vertical travel only. The grid slides 44px along the rail's direction and each row adds 20px of its own, staggered 55ms so the leading row settles first. No scale. | Content arriving along the rail |
| V2 | **Depth** | Depth only. 10px of travel as a direction hint; each card rises from 0.92 behind and recedes to 0.95 on the way out. | Cards coming forward from behind |
| V3 | **Reveal** | Nothing moves. Each card is uncovered in place by an edge travelling in the scroll direction, rippling across the columns (40ms per column). | A clean, editorial reveal |
| V4 | **Photo** | The card frames fade in where they stand; only the product photo settles inside its frame (1.08 → 1, 1.04 for cutouts), then the text follows. | A catalogue drawing your eye to the product |

V3 and V4 stagger across columns as well as rows, so their ripple shows on the
2-card and 1-card collections too — V1/V2 only stagger by row.

Common to all four:
- **Scroll switches collections.** Scroll past the end of the grid to move to the next folder, back past the top for the previous one. The grid stretches with a rubber band before switching; V1 and V2 also carry your scroll speed into the transition.
- **The blue marker stretches, then contracts.** Its leading end races to the new folder so it spans both rows; its trailing end catches up as the switch settles, shrinking it back to size.
- **Hovering a folder opens its card stack** slightly.
- `prefers-reduced-motion` is respected throughout — gentler, not removed.

## Run locally

Double-click `start.command`, or:

```
python3 -m http.server 4323
```

then open http://localhost:4323. There is no build step — React, Motion and
Babel load from CDNs, and `MotionPanel.jsx` is transpiled in the browser.

## Files

- `index.html` — the page chrome, the version picker, and the panel mount
- `MotionPanel.jsx` — the panel and all four transitions
- `panel.css` — panel styles
- `assets/` — chrome SVGs, product photos, icons, fonts

## Notes

- **Fonts.** The page chrome uses Proxima Nova and the panel uses Noontree,
  both as specified in the Figma. Proxima Nova is a licensed commercial font
  (noon holds the licence); the files in `assets/fonts/` should not be reused
  outside noon.
- The grid shows the 7 cards the Figma frame draws against a "9 Items" label,
  to match the frame.
- The five-style exploration this came out of (Morph, Bloom, Dissolve, Slide,
  Depth) lives outside this repo.
