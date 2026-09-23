# noon — Wishlist · collection-switch motion

A recreation of the noon desktop wishlist page (Figma file `bGeam4dYWnlJLz0uJ91DdQ`,
panel frame `419:535726`) with a live saved-items panel in the middle, built to
review **three collection-switch transitions** side by side.

The page chrome (top nav, category bar, list switcher, help band, footer) is
static. Only the panel is interactive.

## The three versions

Switch with the dark pill at the bottom of the page, the `1`–`3` keys, or
`←` / `→`. The choice is kept in the URL (`?v=1` … `?v=3`), so a link opens on
a specific version.

| | Version | What moves | Feel |
| --- | --- | --- | --- |
| V1 | **Unfurl** | Vertical travel only. The grid slides 44px along the rail's direction and each row adds 20px of its own, staggered 55ms so the leading row settles first. No scale. | Content arriving along the rail |
| V2 | **Deal** | The old cards gather into a tilted stack on the first slot, then the new ones are dealt out of it one by one. | Cards handled on a table |
| V3 | **Carousel** | A vertical carousel, timed off the reference video frame by frame. The sections sit one after another on a track: the outgoing one slides up and shrinks to 0.75 as it leaves; the next, right behind it, slides up and grows to full size as it arrives, both on one curve and both scaling from their left edge so they stay aligned to the rail. It's one real track: the strip is the only thing that moves, so switching again mid-flight just redirects it and sections never land on top of each other — cubic-bezier(0.3, 0.05, 0.05, 1) over 0.9s. | Paging through a stack of sections |

V2 and V3 overlap the outgoing and incoming grids, so there's no empty
frame between them. V1 runs in sequence, because its cards travel and would
collide otherwise. V2's grid always fits, so it never clips or fades at the
edges.

Common to all three:
- **Live link:** https://wishlist-web-ivory.vercel.app — every push to `main` redeploys it.
- **Scroll switches collections**, anywhere over the panel (rail included). One flick is one switch; a second flick — even while the first one's trackpad momentum is still running — or a flick back the other way is read straight away. The grid stretches with a rubber band before switching; V1 and V3 also carry your scroll speed into the transition.
- **The heading blur-morphs.** The old folder name dissolves into a blur while the new one sharpens out of it, in the same spot.
- **Edge softening is minimal.** Where cards cross the top or bottom edge mid-switch (V1, V3) there's only a 14px fade and a 1.5px blur, so they don't shear but it doesn't read as an effect.
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
- `MotionPanel.jsx` — the panel and its transitions
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
