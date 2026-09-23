/**
 * MOTION PANEL — collection-switch transitions, real DOM + Motion (framer-motion).
 * Isolated (production SavedItemsScreen.jsx untouched).
 *
 * Two controls, mirroring the motion-lab demo:
 *   • Style  (dark picker): Morph · Bloom · Dissolve · Slide · Depth
 *   • Mode   (in-panel):    Wait (Sequential) · PopLayout (Cross)   → AnimatePresence mode
 *
 * Both controls are harness chrome. The shipped page mounts this with
 * <MotionPanel fixedStyle="slide" fixedMode="wait" chrome={false} /> and gets a
 * clean panel with no picker and no toggle.
 *
 * Bar: Emil + Apple — transform/opacity/filter only, springs, reduced-motion.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, useTransform, useVelocity, animate } from 'framer-motion';

/* Where the product imagery lives, relative to the HOST page — the harness sits
   two levels down from assets/, the shipped page sits beside it. */
let ASSET_BASE = '../../assets/images/';
export function setAssetBase(base) { ASSET_BASE = base; }
const IMG = (n) => ASSET_BASE + n;

/* `fit` mirrors the per-image scale mode in frame 419:535726, measured off its
   render: the square lifestyle photos are cropped to fill, the product cutouts
   are fitted whole. Cropping a cutout lops the top off the bottle or the iron. */
const PRODUCTS = {
  rugHappy:{img:'bdc61.png',fit:'cover', name:'Roseate Happy Super Soft Anti-Skid (40x60 cm) Super Absorbent Mats',sell:49,list:399},
  iron:{img:'16b6c.png',fit:'contain', name:'Bajaj MX 45 Steam Aluminium Soleplate Iron | 2000 Watts Power For',sell:161,list:299},
  rugBirch:{img:'6dd54.png',fit:'cover', name:'Roseate Birch Super Soft (40x60 cm) Microfiber 2000 GSM Bath Mat Super',sell:24,list:99},
  versace:{img:'4ebe2.png',fit:'contain', name:'Compatible with Versace Pour Homme E',sell:699,list:999},
  nautica:{img:'56b12.png',fit:'contain', name:'Blue Eau de Toilette for Men | Long Lasting Fresh',sell:499,list:899},
  sneaker:{img:'56b12.png',fit:'contain', name:"Nautica Voyage Low-Top Sneakers | Men's Casual Lace-Up",sell:499,list:899},
};
const COLLECTIONS = [
  /* 7 cards against a label of 9 is what frame 419:535726 draws — the count is
     the collection's size, the grid shows the first page of it. */
  {id:'all',name:'All saved items',count:9,items:['rugHappy','iron','rugBirch','versace','nautica','versace','iron']},
  {id:'home',name:'Home decor',count:2,items:['rugBirch','rugHappy']},
  {id:'sneakers',name:'Sneakers',count:1,items:['sneaker']},
];

/* geometry for folder-origin math */
const COLS=4, CARD_W=205, CARD_H=484, GAP=20, ROW_PITCH=CARD_H+GAP;
const RAIL_ROW_H=96, THUMB_CX=48, GRID_LEFT=300, GRID_TOP=72;
const cardCentre=(i)=>[(i%COLS)*(CARD_W+GAP)+CARD_W/2, Math.floor(i/COLS)*ROW_PITCH+CARD_H/2];
const folderAnchor=(i)=>[THUMB_CX-GRID_LEFT, i*RAIL_ROW_H+RAIL_ROW_H/2-GRID_TOP];

const SPRING = { type:'spring', stiffness:320, damping:28 };   // motion-lab slide
const MORPH  = { type:'spring', stiffness:280, damping:30 };   // layoutId travel
const BLOOM  = { type:'spring', stiffness:300, damping:26 };
const EASE_OUT = [0.23, 1, 0.32, 1];
/* V3 · Scrubbed. 420px of wheel moves one whole collection; the sheet follows
   the gesture on a critically damped spring (smooths mouse-wheel notches into
   motion instead of steps), and a release past 20% commits. */
const SCRUB_DIST = 420;
const SCRUB_COMMIT = 0.2;
const SCRUB_FOLLOW = { type:'spring', stiffness:520, damping:46 };
const SCRUB_SETTLE = { type:'spring', stiffness:240, damping:30 };
/* V4 · Feed. A click glides the scroll position there — overdamped so a long
   scroll never overshoots its section. */
const FEED_GLIDE = { type:'spring', stiffness:170, damping:28 };

/* Rail preview — the design's "3 or more" stack (68x56): two cards rotated
   +-8deg behind a larger centre card. Every number is from frame 419:535726.
   The frame fills all three slots with placeholder art; here the centre is the
   collection's first item and the wings are its 2nd and 3rd, falling back to
   the frame's own filler images for a collection that hasn't got three. */
const FAN_FILL = ['38e2f.png', 'ec267.png'];
function FolderPreview({ items }) {
  const img = (i, fallback) => (items[i] ? PRODUCTS[items[i]].img : fallback);
  return (
    <span className="mp-fan" aria-hidden>
      <span className="mp-fan-card mp-fan-l"><span className="mp-fan-master"><img src={IMG(img(1, FAN_FILL[0]))} alt="" /></span></span>
      <span className="mp-fan-card mp-fan-r"><span className="mp-fan-master"><img src={IMG(img(2, FAN_FILL[1]))} alt="" /></span></span>
      <span className="mp-fan-card mp-fan-mid"><span className="mp-fan-master"><img src={IMG(img(0, FAN_FILL[0]))} alt="" /></span></span>
    </span>
  );
}

function CardInner({ p }) {
  return (
    <div className="mp-card">
      <div className="mp-top">
        <img className="mp-photo" data-fit={p.fit} src={IMG(p.img)} alt="" />
        <div className="mp-pager"><i className="on"/><i/><i className="sm"/><i className="xs"/></div>
        <div className="mp-kebab"><img src={IMG('73447.svg')} alt=""/></div>
      </div>
      <div className="mp-bottom">
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <p className="mp-name">{p.name}</p>
            <span className="mp-rating"><img src={IMG('1a53e.svg')} alt=""/><b>4.3</b><em>(128)</em></span>
          </div>
          <div className="mp-price"><span className="mp-sell" data-ligatures="on">{'dhm'+p.sell}</span><span className="mp-listed">{p.list}</span><span className="mp-disc">33%</span></div>
          <img className="mp-eta" src={IMG('97c5c.svg')} alt="Express, today"/>
        </div>
        <div className="mp-actions">
          <span className="mp-btnP"><img src={IMG('d85fd.svg')} alt=""/>Add to cart</span>
          <span className="mp-btnI"><img src={IMG('7394a.svg')} alt=""/></span>
        </div>
      </div>
    </div>
  );
}

/* V3 · Scrubbed — one collection per sheet, stacked. `pos` is the fractional
   collection index. A sheet ahead of it (d > 0) waits one page below and slides
   up over the current one as pos approaches; a sheet behind it (d < 0) sinks,
   drifts up at a quarter of the rate and fades out as it is covered, so the
   stack reads as physical depth. Going back runs the same maths in reverse:
   the current sheet slides down and the one beneath rises to meet you.
   Fully covered sheets reach opacity 0 continuously, so nothing can ever peek
   through the incoming sheet's rounded corners at rest. */
const PAGE_GAP = 24;
function Sheet({ i, pos, hRef, children }) {
  const transform = useTransform(pos, (p) => {
    const d = i - p, H = hRef.current;
    if (d >= 0) return `translateY(${(d * (H + PAGE_GAP)).toFixed(2)}px)`;
    const k = Math.min(1, -d);
    return `translateY(${(-k * H * 0.22).toFixed(2)}px) scale(${(1 - 0.05 * k).toFixed(4)})`;
  });
  const opacity = useTransform(pos, (p) => { const d = i - p; return d >= 0 ? 1 : 1 - Math.min(1, -d); });
  return <motion.div className="mp-sheet" style={{ transform, opacity, zIndex: i + 1 }}>{children}</motion.div>;
}

export default function MotionPanel({ fixedStyle, fixedMode, chrome = true }) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [style, setStyle] = useState(fixedStyle || 'morph'); // harness picker drives this
  const [mode, setMode] = useState(fixedMode || 'wait');     // wait | popLayout
  const reduce = useReducedMotion();
  // V3/V4 are position-driven rather than switch-driven: scroll and clicks move
  // one fractional index and everything, rail included, reads from it.
  const styleRef = React.useRef(style); styleRef.current = style;
  const continuous = style === 'scrub' || style === 'feed';

  // let the harness picker drive `style` — skipped when a style is pinned
  React.useEffect(() => {
    if (fixedStyle) return;
    const h = (e) => setStyle(e.detail);
    window.addEventListener('mp:style', h);
    window.dispatchEvent(new CustomEvent('mp:ready'));
    return () => window.removeEventListener('mp:style', h);
  }, [fixedStyle]);

  const col = COLLECTIONS[active];
  // {v} handed from a scroll gesture to the entrance spring; null for a click.
  const launchRef = React.useRef(null);
  const select = (i) => {
    if (i===active) return;
    launchRef.current = null;
    if (styleRef.current === 'feed') { feedGoRef.current?.(i); return; }
    if (styleRef.current === 'scrub') { scrubGoRef.current?.(i); return; }
    setDir(Math.sign(i-active)); setActive(i);
  };
  // Set by the V3/V4 machinery further down; read by select() and the wheel.
  const feedGoRef = React.useRef(null), scrubGoRef = React.useRef(null);
  const scrubWheelRef = React.useRef(null), feedAnimRef = React.useRef(null);

  /* ---- scroll drives the switch ----
     The grid scrolls normally; only an *overscroll* past an edge changes
     collection, so we never hijack a scroll the user meant for the content.
     Scrolling down goes to the next collection, which is also the direction
     the rail runs — so `dir` feeds the same Slide axis a rail click would. */
  const stageRef = React.useRef(null);
  const activeRef = React.useRef(0);
  React.useEffect(() => { activeRef.current = active; }, [active]);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // One notch of a mouse wheel is ~100px and a deliberate trackpad flick
    // passes this within a few frames, so a genuine gesture always registers;
    // a stray one or two pixels of drift does not.
    const OVERSCROLL = 48;
    // Stillness required before another switch can fire. Long enough that one
    // gesture stays one switch even when the grid fits and therefore sits at an
    // edge for every single event — at 220ms a slow flick skipped a collection.
    const QUIET = 400;
    // Floor on the time between switches, independent of event spacing. The
    // quiet timer alone can re-arm mid-gesture if events arrive sparsely, and
    // one fling would then jump two collections. Nothing useful happens inside
    // this window anyway — the transition itself runs ~430ms.
    const MIN_GAP = 420;
    // Rubber band. Without it an overscroll below the threshold produces
    // nothing at all — no scroll, no movement, no hint the gesture landed —
    // which is what made the switch feel unreliable. The band decelerates as it
    // stretches and reaches its cap right as the threshold fires, so the limit
    // is something you feel rather than guess at. Half travel at the ends,
    // where there is nothing to switch to.
    const PULL = 12, PULL_END = 6;
    const wrap = wrapRef.current;
    const band = (acc, down, cap = PULL) => {
      const v = Math.min(cap, Math.abs(acc) * 0.28) * (down ? -1 : 1);
      wrap?.removeAttribute('data-release');
      wrap?.style.setProperty('--rubber', v.toFixed(1) + 'px');
      // A pull displaces the content past the stage edge, so it clips there
      // exactly as a transition does — bring the fade in with it, scaled to how
      // far it has stretched. Without this the cards shear off mid-pull.
      wrap?.style.setProperty('--fade-pull', Math.min(30, Math.abs(v) * 2.2).toFixed(1) + 'px');
    };
    const release = () => {
      if (!wrap || wrap.style.getPropertyValue('--rubber') === '0px') return;
      wrap.setAttribute('data-release', '');
      wrap.style.setProperty('--rubber', '0px');
      wrap.style.setProperty('--fade-pull', '0px');
    };


    const g = { armed:true, acc:0, timer:0, last:0, first:0 };

    const onWheel = (e) => {
      if (!e.deltaY) return;
      // V4 is plain native scrolling — just cancel any click-driven glide.
      if (styleRef.current === 'feed') { feedAnimRef.current?.stop(); el.style.scrollSnapType = ''; return; }
      // V3 owns the gesture outright: the wheel IS the transition.
      if (styleRef.current === 'scrub') { scrubWheelRef.current?.(e); return; }
      const down = e.deltaY > 0;
      const atEdge = down
        ? el.scrollTop + el.clientHeight >= el.scrollHeight - 2
        : el.scrollTop <= 1;

      clearTimeout(g.timer);
      g.timer = setTimeout(() => { g.armed = true; g.acc = 0; release(); }, QUIET);

      if (!atEdge) { g.acc = 0; release(); return; }
      // One switch per gesture: momentum keeps firing wheel events long after
      // the user let go, which would otherwise skip straight past a collection.
      if (!g.armed || performance.now() - g.last < MIN_GAP) { e.preventDefault(); return; }

      // Opposite-direction events inside a gesture: a few px of trackpad wobble
      // is ignored, a real reversal starts a new gesture. Summing them signed
      // let a wobble cancel out most of a scroll and swallow it entirely.
      if (g.acc && Math.sign(e.deltaY) !== Math.sign(g.acc)) {
        if (Math.abs(e.deltaY) < 25) return;
        g.acc = 0;
      }
      if (!g.acc) g.first = performance.now();
      g.acc += e.deltaY;

      const next = activeRef.current + (down ? 1 : -1);
      const atEnd = next < 0 || next >= COLLECTIONS.length;

      // Stretch while the gesture builds, and keep stretching — but never
      // switch — when there is nowhere further to go.
      if (atEnd || Math.abs(g.acc) < OVERSCROLL) {
        e.preventDefault();
        band(g.acc, down, atEnd ? PULL_END : PULL);
        return;
      }

      e.preventDefault();
      /* Hand the gesture's energy to the transition. The band is stretched and
         moving when the threshold fires; releasing it to 0 and entering the new
         grid from a standing start makes the two read as strangers. Snap the
         band (no 280ms return — the cards take over) and pass the wheel's speed
         into the entrance spring as initial velocity. Sign: a downward wheel
         drives content upward, so the velocity is negative.

         The band is EASED back, not snapped. Snapping looked right on paper —
         "the cards take over" — but the cards taking over are the incoming
         ones, while the outgoing grid is still fully opaque: it teleported
         8.4px in a single frame. The 280ms return overlaps the exit instead. */
      const dt = Math.max(16, performance.now() - (g.first || performance.now()));
      /* Capped at 1400px/s, measured not guessed. Uncapped, a hard fling gave
         the spring enough energy to overshoot 36px on a 44px travel — the grid
         visibly flew past and came back. Measured overshoot by cap:
             900 -> 3.6px flat (gradient gone, every flick saturates)
            1400 -> 4.2px gentle, 11px firm      <- here
            1900 -> 3.5px gentle, 21px firm      (too loose)
         1400 keeps a real gradient and bounds the top at a quarter of the
         travel. */
      const speed = Math.min(1400, Math.abs(g.acc) / dt * 1000);
      launchRef.current = { v: -Math.sign(e.deltaY) * speed };
      release();
      g.armed = false; g.acc = 0; g.first = 0; g.last = performance.now();
      setDir(down ? 1 : -1);
      setActive(next);
      // Land on the edge you travelled towards, so the next overscroll in the
      // same direction is a fresh gesture rather than an instant re-trigger.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.scrollTop = down ? 0 : el.scrollHeight;
      }));
    };

    el.addEventListener('wheel', onWheel, { passive:false });
    // Releasing on pointer-leave stops a stretched band hanging there if the
    // cursor leaves mid-gesture and no further wheel events arrive.
    el.addEventListener('pointerleave', release);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerleave', release);
      clearTimeout(g.timer);
    };
  }, []);

  /* ---- edge fade ----
     A card sliced flat by the panel edge reads as a rendering bug. The stage is
     masked and progressively blurred at both edges, each sized to how much
     scroll is actually left so it eases away at an edge rather than popping.
     Vars live on the wrapper because the blur overlays are siblings of the
     scroller and need the same numbers. */
  const wrapRef = React.useRef(null);
  const syncFade = React.useCallback(() => {
    const el = stageRef.current, wrap = wrapRef.current;
    if (!el || !wrap) return;
    const remaining = el.scrollHeight - el.clientHeight - el.scrollTop;
    wrap.style.setProperty('--fade-top', Math.max(0, Math.min(28, el.scrollTop)) + 'px');
    wrap.style.setProperty('--fade-bot', Math.max(0, Math.min(44, remaining)) + 'px');
  }, []);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    syncFade();
    el.addEventListener('scroll', syncFade, { passive:true });
    const ro = new ResizeObserver(syncFade);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);  // content height
    return () => { el.removeEventListener('scroll', syncFade); ro.disconnect(); };
  }, [syncFade]);

  /* A switch translates the grid past the stage bounds, so it gets clipped even
     when nothing scrolls. Flag the whole transition and let CSS raise the fade
     for its duration — it eases in and out, so it never announces itself. */
  const [moving, setMoving] = useState(false);
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (styleRef.current === 'scrub' || styleRef.current === 'feed') return;
    setMoving(true);
    // Cleared when the grid's own entrance reports done (onAnimationComplete
    // below); this is only the backstop for a style whose entrance never fires
    // one, and it is short so the band can't outlive the movement.
    const t = setTimeout(() => setMoving(false), 340);
    return () => clearTimeout(t);
  }, [active]);

  // previous collection's first-occurrence centres, for Morph matching
  const prev = React.useRef({ items: COLLECTIONS[0].items, index: 0 });
  const fromMap = React.useMemo(() => {
    const m = new Map();
    prev.current.items.forEach((k, idx) => { if (!m.has(k)) m.set(k, cardCentre(idx)); });
    return m;
  }, [active]);
  React.useEffect(() => { prev.current = { items: col.items, index: active }; }, [active]);

  /* ---- whole-grid variants (Slide / Dissolve) ---- */
  /* Slide travels on Y, matching the rail's own axis: picking a collection
     further down the rail brings the grid up from below and sends the old one
     out the top. Sideways motion contradicted the rail and read as arbitrary. */
  /* gridScale: V1 ('slide') shrinks the whole grid to 0.98 — across 880px
     that is sub-pixel on most of the content. V2 ('slideDepth') passes 1 here
     and puts the depth on the cards instead (see cardDepthV). */
  const makeSlideV = (travel, gridScale) => ({
    enter: (d)=>({ y: reduce?0:(d>0?travel:-travel), opacity:0, filter: reduce?'blur(0px)':'blur(4px)', scale: reduce?1:gridScale }),
    /* The entrance spring inherits the scroll gesture's velocity when there was
       one, so a flick flows into the transition instead of handing over to a
       standing start. A rail click clears it and the spring starts from rest. */
    center:{ y:0, opacity:1, filter:'blur(0px)', scale:1, transition:{
      // Velocity scales with the travel: V2 moves 10px, and a flick tuned for
      // 44px would throw it well past its resting place.
      y:{ ...SPRING, ...(launchRef.current ? { velocity: launchRef.current.v * travel / 44 } : null) },
      opacity:{duration:0.22}, scale:{duration:0.2}, filter:{duration:0.2} } },
    /* The exit must not use SPRING on y. mode="wait" holds the incoming grid
       until every exit value settles, and a spring's tail runs ~500ms long
       after opacity has already hit 0 — which left the stage blank for ~350ms.
       A duration curve ends when it looks like it has ended. */
    exit:(d)=>({ y: reduce?0:(d>0?-travel:travel), opacity:0, filter: reduce?'blur(0px)':'blur(4px)', scale: reduce?1:gridScale, transition:{ y:{duration:0.2, ease:EASE_OUT}, opacity:{duration:0.18}, scale:{duration:0.2}, filter:{duration:0.18} } }),
  });
  /* V1 and V2 used to share 44px of travel plus a little scale, and the
     travel drowned the scale — they read as the same transition. Now they sit
     on different axes: V1 is pure Y (full travel, no scale anywhere), V2 is
     pure Z (10px of travel as a direction hint, all the depth on the cards). */
  const slideV = makeSlideV(44, 1);
  const slideDepthV = makeSlideV(10, 1);
  /* Depth — Material shared-axis Z / iOS push. Forward: both surfaces travel
     toward the viewer (old scales up and out, new rises from behind). Reverse
     flips it, so the axis reads as going back. Blur sells the focal plane. */
  const depthV = {
    enter:(d)=>({ opacity:0, scale: reduce?1:(d>0?0.94:1.06), filter: reduce?'blur(0px)':'blur(4px)' }),
    center:{ opacity:1, scale:1, filter:'blur(0px)', transition:{ scale:{duration:0.26, ease:EASE_OUT}, opacity:{duration:0.22}, filter:{duration:0.22} } },
    exit:(d)=>({ opacity:0, scale: reduce?1:(d>0?1.06:0.94), filter: reduce?'blur(0px)':'blur(4px)', transition:{ scale:{duration:0.2, ease:EASE_OUT}, opacity:{duration:0.16}, filter:{duration:0.16} } }),
  };
  const dissolveV = {
    enter:{ opacity:0, y: reduce?0:8, filter: reduce?'blur(0px)':'blur(2px)' },
    center:{ opacity:1, y:0, filter:'blur(0px)', transition:{ duration:0.24, ease:EASE_OUT } },
    exit:{ opacity:0, y: reduce?0:-6, filter: reduce?'blur(0px)':'blur(2px)', transition:{ duration:0.12, ease:EASE_OUT } },
  };

  /* Title. Functions are only resolved for NAMED variants (+ custom) — passing
     them straight to initial/exit silently stalls the exit and wedges
     AnimatePresence mode="wait". */
  /* The heading holds its baseline and only cross-fades. It is a single short
     word sitting on a fixed line — moving it as well as fading it read as two
     separate events, and the fade alone already carries the change. */
  const titleV = {
    enter:{ opacity:0, filter: reduce?'blur(0px)':'blur(3px)' },
    center:{ opacity:1, filter:'blur(0px)', transition:{ duration:0.22, ease:EASE_OUT } },
    exit:{ opacity:0, filter: reduce?'blur(0px)':'blur(3px)', transition:{ duration:0.18, ease:EASE_OUT } },
  };

  /* ---- unfurl (Slide only) ----
     The grid used to travel as one rigid slab: seven cards in perfect lockstep,
     which reads as a page sliding rather than content arriving. The parent
     still carries the main travel; each card adds a smaller offset of its own,
     delayed by row so the row nearest the direction of travel settles first.

     Deliberately no `exit` variant on the cards. On exit AnimatePresence's
     `custom` is what keeps the OUTGOING tree pointing the right way, and a
     child with its own `custom` would hold the stale dir from its last render
     — so reversing direction would fling the old grid the wrong way. Cards
     animate on entrance only; on exit they ride the parent. */
  const CARD_RISE = 20;
  // V1: travel only. Scale removed so nothing competes with the vertical read.
  const cardV = {
    enter: ({ d }) => ({ y: reduce ? 0 : (d > 0 ? CARD_RISE : -CARD_RISE) }),
    center: ({ delay }) => ({ y:0, transition:{ y:{ ...SPRING, delay } } }),
  };
  /* V2 · card depth. Same unfurl, but the depth that used to live on the grid
     moves onto each card at 0.96 — every card shrinks about its own centre, so
     the gutters open and close and the grid reads as separate objects at a
     depth rather than one flat sheet. It scales on the way OUT as well.
     That exit variant is safe despite the stale-dir trap above: scale doesn't
     depend on direction, so a stale `custom` has nothing wrong to hold. It's a
     plain object — it never reads custom at all. Kept at 0.2s and unstaggered
     so it can't lengthen mode="wait"'s blank hold. */
  // V2: depth only. Cards rise from behind at 0.92 and recede to 0.95; no
  // card travel, so the scale is the whole story.
  const cardDepthV = {
    enter: { scale: reduce ? 1 : 0.92 },
    center: ({ delay }) => ({ scale:1, transition:{ scale:{ type:'spring', stiffness:300, damping:30, delay } } }),
    exit: { scale: reduce ? 1 : 0.95, transition:{ scale:{ duration:0.2, ease:EASE_OUT } } },
  };
  const ROW_STAGGER = style === 'slideDepth' ? 0.045 : 0.055;
  const rowDelay = (i, n) => {
    if (reduce) return 0;
    const rows = Math.ceil(n / COLS), row = Math.floor(i / COLS);
    return (dir > 0 ? row : rows - 1 - row) * ROW_STAGGER;
  };

  const isSharedGrid = style === 'morph' || style === 'bloom';
  const unfurl = style === 'slide' || style === 'slideDepth';

  /* ---- one position to drive them all ----
     `pos` is the fractional collection index. The rail's selection layer reads
     it in every mode, so in V3/V4 the white row and its corners glide BETWEEN
     folders continuously instead of jumping. V1/V2 spring it to `active` on
     each switch; V3 moves it with the wheel and clicks; V4 derives it from the
     scroll position. */
  const N = COLLECTIONS.length;
  const pos = useMotionValue(0);
  const railTransform = useTransform(pos, (v) => `translateY(${(v * RAIL_ROW_H).toFixed(2)}px)`);
  /* Apple-style stretch on the blue marker, driven by velocity: the faster the
     selection travels, the longer the marker, and the extra length trails
     back toward the folder it left. Velocity rather than a fixed keyframe, so
     it works identically for clicks, the V3 scrub and the V4 scroll, and it
     relaxes to 22px by itself as the motion settles. Capped at 2.8x — a hint,
     not a smear. Anchoring on the LEADING edge is done with a counter-translate
     (half the added length) so transform-origin never has to flip. */
  const posVel = useVelocity(pos);
  const NOTCH_H = 22;
  const notchTransform = useTransform(posVel, (v) => {
    if (reduce) return 'none';
    const k = 1 + Math.min(1.8, Math.abs(v) * 0.26);
    const shift = -Math.sign(v) * (NOTCH_H / 2) * (k - 1);
    return `translateY(${shift.toFixed(2)}px) scaleY(${k.toFixed(3)})`;
  });
  React.useEffect(() => {
    if (continuous) return;
    const c = animate(pos, active, reduce ? { duration:0 } : SPRING);
    return () => c.stop();
  }, [active, continuous]);

  // In V3/V4 the heading follows whichever collection is nearer on screen.
  const [liveIdx, setLiveIdx] = useState(0);
  React.useEffect(() => pos.on('change', (v) => {
    if (styleRef.current !== 'scrub' && styleRef.current !== 'feed') return;
    const a = Math.max(0, Math.min(N - 1, Math.round(v)));
    setLiveIdx((cur) => (cur === a ? cur : a));
    if (styleRef.current === 'scrub') {
      // A sheet edge mid-stage means content is crossing the panel edge.
      const f = Math.abs(v - Math.round(v));
      wrapRef.current?.style.setProperty('--fade-pull', Math.min(30, f * 80).toFixed(1) + 'px');
    }
  }), []);

  /* ---- V3 · Scrubbed ---- */
  const pageHRef = React.useRef(988);
  React.useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const measure = () => { pageHRef.current = el.clientHeight || 988; };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const posAnim = React.useRef(null);
  const settle = (t) => {
    posAnim.current?.stop();
    posAnim.current = animate(pos, t, { ...(reduce ? { duration:0 } : SCRUB_SETTLE),
      onComplete: () => { if (t !== activeRef.current) { setDir(Math.sign(t - activeRef.current)); setActive(t); } } });
  };
  const follow = (t) => { posAnim.current?.stop(); posAnim.current = animate(pos, t, reduce ? { duration:0 } : SCRUB_FOLLOW); };
  scrubGoRef.current = (i) => settle(i);
  const sg = React.useRef({ live:false, acc:0, base:0, timer:0, locked:false });
  scrubWheelRef.current = (e) => {
    e.preventDefault();
    const s = sg.current;
    clearTimeout(s.timer);
    // After a commit, momentum keeps arriving for a while; swallow it.
    if (s.locked) { s.timer = setTimeout(() => { s.locked = false; }, 180); return; }
    if (!s.live) {
      // Start from wherever the sheets are now — possibly mid-settle — so a new
      // gesture grabs the motion rather than yanking it back to the last index.
      const p = pos.get(); s.base = Math.round(p); s.acc = (p - s.base) * SCRUB_DIST; s.live = true;
    }
    s.acc += e.deltaY;
    const raw = s.acc / SCRUB_DIST, side = Math.sign(raw);
    const has = side > 0 ? s.base + 1 < N : s.base - 1 >= 0;
    if (has && Math.abs(raw) >= 1) {
      settle(s.base + side); s.live = false; s.locked = true;
      s.timer = setTimeout(() => { s.locked = false; }, 180);
      return;
    }
    // Past the first or last collection: a small resistant give, never a switch.
    follow(has ? s.base + raw : s.base + side * Math.min(0.06, Math.abs(raw) * 0.25));
    s.timer = setTimeout(() => {
      const off = pos.get() - s.base;
      const go = Math.abs(off) >= SCRUB_COMMIT && (off > 0 ? s.base + 1 < N : s.base - 1 >= 0);
      settle(go ? s.base + Math.sign(off) : s.base);
      s.live = false;
    }, 140);
  };

  /* ---- V4 · Feed ---- */
  const feedSpy = React.useCallback(() => {
    if (styleRef.current !== 'feed') return;
    const el = stageRef.current; if (!el) return;
    const secs = [...el.querySelectorAll('[data-sec]')]; if (!secs.length) return;
    const tops = secs.map((x) => x.offsetTop), y = el.scrollTop;
    let i = 0; while (i < tops.length - 1 && y >= tops[i + 1] - 1) i++;
    const p = i < tops.length - 1 ? i + Math.max(0, (y - tops[i]) / (tops[i + 1] - tops[i])) : i;
    pos.set(p);
    const a = Math.max(0, Math.min(N - 1, Math.round(p)));
    if (a !== activeRef.current) { setDir(Math.sign(a - activeRef.current)); setActive(a); }
  }, []);
  React.useEffect(() => {
    if (style !== 'feed') return;
    const el = stageRef.current; if (!el) return;
    // Room under the last section so it can scroll up to the top like the rest.
    const fit = () => {
      const last = el.querySelector('section[data-sec]:last-of-type'), tail = el.querySelector('.mp-feed-tail');
      if (last && tail) tail.style.height = Math.max(0, el.clientHeight - last.offsetHeight) + 'px';
      feedSpy();
    };
    fit();
    el.addEventListener('scroll', feedSpy, { passive:true });
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => { el.removeEventListener('scroll', feedSpy); ro.disconnect(); };
  }, [style, feedSpy]);
  feedGoRef.current = (i) => {
    const el = stageRef.current, sec = el?.querySelector(`[data-sec="${i}"]`); if (!sec) return;
    feedAnimRef.current?.stop();
    el.style.scrollSnapType = 'none';   // snapping would fight every intermediate frame
    feedAnimRef.current = animate(el.scrollTop, sec.offsetTop, { ...(reduce ? { duration:0 } : FEED_GLIDE),
      onUpdate: (v) => { el.scrollTop = v; }, onComplete: () => { el.style.scrollSnapType = ''; } });
  };
  const titleCol = continuous ? COLLECTIONS[liveIdx] : col;
  const staticGrid = (c) => (
    <div className="mp-grid">{c.items.map((k, j) => <div key={j} className="mp-cell"><CardInner p={PRODUCTS[k]} /></div>)}</div>
  );

  return (
    <div className="mp-frame">
      {/* rail */}
      <LayoutGroup>
      <nav className="mp-rail" role="tablist">
        {/* Selection is one moving object: the white row, its blue notch and the
            two inverted corners that tie it into the content area. It travels on
            the grid's spring so the rail and the cards read as one gesture.
            Full transform string — the x/y shorthands aren't accelerated. */}
        <motion.span className="mp-sel" aria-hidden style={{ transform: railTransform }}>
          <motion.span className="mp-sel-notch" style={{ transform: notchTransform }} />
          <img className="mp-sel-corner mp-sel-corner-top" src={IMG('37a34.svg')} alt="" />
          <img className="mp-sel-corner mp-sel-corner-bot" src={IMG('37a34.svg')} alt="" />
        </motion.span>
        {COLLECTIONS.map((c,i)=>{
          const on = i===active;
          return (
            <button key={c.id} className="mp-row" role="tab" aria-selected={on} tabIndex={on?0:-1} onClick={()=>select(i)}>
              <FolderPreview items={c.items} />
              <span className="mp-meta">
                <span className="mp-rowName">{c.name}</span>
                <span className="mp-rowCount">{c.count} Items</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* content */}
      <div className="mp-content">
        <div className="mp-header">
          <div className="mp-title-wrap">
            {/* Same mode as the grid. Hardcoding "wait" here meant that under
                popLayout the cards were fully in before the heading had even
                started moving — same curve, but 200ms apart. */}
            <AnimatePresence mode={mode} initial={false} custom={dir}>
              <motion.h1 key={titleCol.id} className="mp-title" custom={dir}
                variants={titleV} initial="enter" animate="center" exit="exit">{titleCol.name}</motion.h1>
            </AnimatePresence>
          </div>
          {/* mode toggle — motion-lab. Harness only. */}
          {chrome && (
            <div className="mp-modes" role="radiogroup" aria-label="AnimatePresence mode">
              {[['wait','Wait (Sequential)'],['popLayout','PopLayout (Cross)']].map(([id,label])=>(
                <button key={id} role="radio" aria-checked={mode===id} className={`mp-mode${mode===id?' on':''}`} onClick={()=>setMode(id)}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* ---- the grid ----
             Keyed on style+mode: Motion's AnimatePresence `mode` is not meant to
             change on a mounted instance, and swapping between the shared-grid
             and whole-grid trees orphans in-flight exits. Remounting the subtree
             on either control is the clean fix. */}
        {/* The scroll container must stay mounted across style/mode changes —
            the wheel listener is bound to it once — so the remount key lives on
            an inner wrapper, not on .mp-stage itself. */}
        {/* layoutScroll: Morph's cells use layout animations, and their nearest
            scrollable ancestor is this stage. Without it Motion measures against
            a stale scroll offset — switching into the tall collection wedged the
            exit and froze mode="wait" entirely. */}
        <div className="mp-stage-wrap" ref={wrapRef} data-moving={moving ? '' : undefined}>
        <motion.div className="mp-stage" layoutScroll ref={stageRef}
          data-mode={style === 'scrub' ? 'scrub' : style === 'feed' ? 'feed' : undefined}>
        <div key={`${style}-${mode}`} className="mp-presence">
        {style === 'scrub' ? (
          <div className="mp-sheets">
            {COLLECTIONS.map((c, i) => <Sheet key={c.id} i={i} pos={pos} hRef={pageHRef}>{staticGrid(c)}</Sheet>)}
          </div>
        ) : style === 'feed' ? (
          <div className="mp-feed">
            {COLLECTIONS.map((c, i) => <section key={c.id} className="mp-sec" data-sec={i} aria-label={c.name}>{staticGrid(c)}</section>)}
            <div className="mp-feed-tail" aria-hidden />
          </div>
        ) : isSharedGrid ? (
          <div className="mp-grid">
            <AnimatePresence mode={mode} custom={dir} initial={false}>
              {col.items.map((key,i)=>{
                const [cx,cy]=cardCentre(i);
                if (style==='morph') {
                  const old = fromMap.get(key);
                  const uniqueId = col.items.indexOf(key)===i ? key : `${key}-${i}`; // dedupe layoutId
                  const matched = !!old && col.items.indexOf(key)===i;
                  return (
                    <motion.div key={`${col.id}-${i}`} className="mp-cell"
                      layoutId={matched?uniqueId:undefined} layout={matched?true:'position'}
                      initial={ matched?false:{ opacity:0, x: (folderAnchor(active)[0]-cx), y:(folderAnchor(active)[1]-cy), scale:0.82 } }
                      animate={{ opacity:1, x:0, y:0, scale:1 }}
                      exit={{ opacity:0, scale:0.9, transition:{duration:0.15} }}
                      transition={MORPH}>
                      <CardInner p={PRODUCTS[key]} />
                    </motion.div>
                  );
                }
                // bloom
                return (
                  <motion.div key={`${col.id}-${i}`} className="mp-cell"
                    initial={{ opacity:0, x:(folderAnchor(active)[0]-cx), y:(folderAnchor(active)[1]-cy), scale:0.82 }}
                    animate={{ opacity:1, x:0, y:0, scale:1, transition:{...BLOOM, delay: reduce?0:i*0.035} }}
                    exit={{ opacity:0, scale:0.94, transition:{duration:0.12} }}>
                    <CardInner p={PRODUCTS[key]} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="mp-grid-wrap">
            <AnimatePresence mode={mode} custom={dir} initial={false}>
              <motion.div key={col.id} className="mp-grid" custom={dir}
                variants={style==='slide'?slideV:style==='slideDepth'?slideDepthV:style==='depth'?depthV:dissolveV}
                initial="enter" animate="center" exit="exit"
                onAnimationComplete={(d)=>{ if (d === 'center') setMoving(false); }}>
                {col.items.map((key,i)=> unfurl ? (
                  <motion.div key={i} className="mp-cell" variants={style==='slideDepth'?cardDepthV:cardV}
                    custom={{ d: dir, delay: rowDelay(i, col.items.length) }}>
                    <CardInner p={PRODUCTS[key]} />
                  </motion.div>
                ) : (
                  <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        </div>
        </motion.div>
        {/* Blur only — the mask on .mp-stage does the fade. Siblings of the
            scroller so they stay pinned while the content moves under them. */}
        <span className="mp-edge mp-edge-t" aria-hidden />
        <span className="mp-edge mp-edge-b" aria-hidden />
        </div>
      </div>
      </LayoutGroup>
    </div>
  );
}
