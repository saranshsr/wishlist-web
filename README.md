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
| V2 | **Depth** | Depth at section level. The whole outgoing grid shrinks to 0.95 and fades as one piece; the whole incoming grid rises from 0.90 to full size, sharpening out of a slight blur. Both scale toward the middle of the panel. | The next section coming up to meet you |
| V3 | **Focus Pull** | Nothing moves or scales. The old grid blurs out; the new one fades in quickly (180ms) but keeps sharpening from a 10px blur for 400ms, so you see focus resolving rather than a crossfade. | A camera pulling focus |
| V4 | **Rail-anchored Bloom** | The new grid grows 0.97 → 1 from its left edge at the height of the folder you clicked, and the cards fade in as a diagonal wave spreading out from that point. | The collection opening out of its folder |

V2, V3 and V4 overlap the outgoing and incoming grids, so there's no empty
frame between them. V1 runs in sequence, because its cards travel and would
collide otherwise.

Common to all four:
- **Live link:** https://wishlist-web-ivory.vercel.app — every push to `main` redeploys it.
- **Scroll switches collections.** Scroll past the end of the grid to move to the next folder, back past the top for the previous one. The grid stretches with a rubber band before switching; V1 and V2 also carry your scroll speed into the transition.
- **The blue marker stretches, then contracts.** Its leading end races to the new folder so it spans both rows; its trailing end catches up as the switch settles, shrinking it back to size.
- **Hovering a folder opens its card stack** slightly.
- `prefers-reduced-motion` is respected throughout — gentler, not removed.

## Motion lab

`lab.html` (live at https://wishlist-web-ivory.vercel.app/lab.html) keeps V1 · Unfurl
as the reference next to Deal and three more transitions that treat the cards
like cards on a table. Same picker, same keys (`1`–`5`, `←` / `→`, `?v=`).

| | Transition | What moves |
| --- | --- | --- |
| 1 | **V1 · Unfurl** | The reference, unchanged. |
| 2 | **Deal** | The old cards gather onto the first slot like a stack, then the new ones deal out of it, one after another. |
| 3 | **Ribbon** | Each new card slides out from under its neighbour: the top row ribbons out to the right, the second row slides down from under the first. The old cards fold back the same way. |
| 4 | **Flip** | Nothing travels. Every card turns over in place, in a diagonal wave, and the new product is on the other side. |
| 5 | **Toss** | The old cards are picked up (they lift and fade); the new ones are tossed onto the table one by one and land with a small settle. |

The grid always fits the panel in these, so nothing scrolls and the edge fade
and blur are switched off: cards are never clipped. Scrolling past an edge
still switches folders.

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
