# noon — Wishlist · collection-switch motion

A recreation of the noon desktop wishlist page (Figma file `bGeam4dYWnlJLz0uJ91DdQ`,
panel frame `419:535726`) with a live saved-items panel in the middle, built to
review **six collection-switch transitions** side by side.

The page chrome (top nav, category bar, list switcher, help band, footer) is
static. Only the panel is interactive.

## The six versions

Switch with the dark pill at the bottom of the page, the `1`–`6` keys, or
`←` / `→`. The choice is kept in the URL (`?v=1` … `?v=6`), so a link opens on
a specific version.

| | Version | What moves | Feel |
| --- | --- | --- | --- |
| V1 | **Unfurl** | Vertical travel only. The grid slides 44px along the rail's direction and each row adds 20px of its own, staggered 55ms so the leading row settles first. No scale. | Content arriving along the rail |
| V2 | **Deal** | The old cards gather into a tilted stack on the first slot, then the new ones are dealt out of it one by one. | Cards handled on a table |
| V3 | **Carousel** | A vertical carousel, timed off the reference video frame by frame. The sections sit one after another on a track: the outgoing one slides up and shrinks to 0.75 as it leaves; the next, right behind it, slides up and grows to full size as it arrives, both on one curve and both scaling from their left edge so they stay aligned to the rail. It's one real track: the strip is the only thing that moves, so switching again mid-flight just redirects it and sections never land on top of each other — cubic-bezier(0.3, 0.05, 0.05, 1) over 0.9s. | Paging through a stack of sections |
| V4 | **Layered** | Fade-through with in-card parallax (Material fade-through, Family's direction, GOAT's parallax). The old grid fades quietly in place; new cards rise 28px one by one along the rail's direction, and inside each the photo drifts in a beat behind its frame, then the text, then the buttons. | A card arriving in layers |
| V5 | **Wave** | A distance-based stagger from the tab you clicked: the nearest card lands first, the farthest last, each rising 16px and growing from 0.95. The old grid fades out together. | The collection spreading out from its tab |
| V6 | **Tray** | Family's breathing trays: the panel itself changes height to fit the collection (7 cards ↔ 1 row visibly exhales and inhales, on a spring with a faint settle). Old cards step out in reverse order, new ones step in. The page below moves with it. | The panel resizing around its contents |

V2 and V3 overlap the outgoing and incoming grids, so there's no empty
frame between them. V1 runs in sequence, because its cards travel and would
collide otherwise. V2's grid always fits, so it never clips or fades at the
edges.

Common to all six:
- **Live link:** https://wishlist-web-ivory.vercel.app — every push to `main` redeploys it.
- **Scroll switches collections**, anywhere over the panel (rail included). One flick is one switch; a second flick — even while the first one's trackpad momentum is still running — or a flick back the other way is read straight away. The grid stretches with a rubber band before switching; V1 and V3 also carry your scroll speed into the transition.
- **The heading changes with the version.** In V1 and V3 it blur-morphs: the old folder name dissolves into a blur while the new one sharpens out of it, in the same spot. V2 has no blur anywhere, so there the new name is dealt in letter by letter, left to right in the order the cards are dealt, each letter settling down from just above — no tilt.
- **Edge softening is minimal.** Where cards cross the top or bottom edge mid-switch (V1, V3) there's only a 14px fade and a 1.5px blur, so they don't shear but it doesn't read as an effect. It dissolves over ~0.5s as the cards settle rather than switching off.
- **The blue marker stretches, then contracts.** Its leading end races to the new folder so it spans both rows; its trailing end catches up as the switch settles, shrinking it back to size.
- **Hovering a folder opens its card stack** slightly.
- **No one-frame blinks.** Every fading element is driven by Motion itself rather than the browser's animation engine, which briefly dropped cards to 0 opacity as their fade finished.
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

## Edge blur & fade toggle

The pill on the right (beside the picker on narrower windows) switches the
clipping treatment off — no edge fade, no edge blur — so V1 and V3 can be
compared with and without it. Nothing else about the transitions changes.
`E` toggles it, and `?edge=off` opens a link with it off. V2 never clips, so
the toggle is greyed out there.

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
