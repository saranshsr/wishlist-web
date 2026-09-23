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
| V3 | **Scrubbed** | Each collection is a sheet. The next sheet slides up over the current one, which sinks and fades beneath it. Follows the trackpad continuously, reversible mid-gesture; release past 20% commits. | Direct manipulation |
| V4 | **Feed** | No transition — all collections are sections of one scroll. Clicking a folder glides the scroll there. | Just scrolling |

Common to all four:
- **Scroll switches collections.** Scroll past the end of the grid to move to the next folder, back past the top for the previous one. V1/V2 stretch with a rubber band before switching and carry your scroll speed into the transition.
- **The blue marker stretches with speed** and trails back toward the folder it left, then settles to its resting size.
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
