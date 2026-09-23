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
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion';

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
/* The blue marker's two ends. The lead is fast and lands early (the marker
   stretches across both rows); the trail is a touch slower than the white row
   so the marker contracts back to size just as the switch settles. */
const NOTCH_TOP = 37, NOTCH_H = 22;
const NOTCH_LEAD  = { type:'spring', stiffness:900, damping:56 };
const NOTCH_TRAIL = { type:'spring', stiffness:260, damping:30, delay:0.04 };

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

/* V4 · Photo — the one piece of motion inside the card: the photo settles
   from a slight zoom while the frame, gutters and text stay put. .mp-top clips
   it, so the card itself never grows (which would read as V2). Cutouts get a
   smaller zoom than lifestyle photos — scaling a product on white reads as the
   product itself swelling. The text used to arrive 60ms after its photo; on a
   filmstrip that showed as photos sitting there with no text under them, which
   reads as half-loaded, so the text now simply arrives with its card. */
const photoV = (fit) => ({ enter:{ scale: fit === 'contain' ? 1.035 : 1.07 },
  center:{ scale:1, transition:{ duration:0.5, ease:[0.23, 1, 0.32, 1] } } });

function CardInner({ p, settle = false }) {
  const Img = settle ? motion.img : 'img';
  const Bottom = 'div';
  return (
    <div className="mp-card">
      <div className="mp-top">
        <Img className="mp-photo" data-fit={p.fit} src={IMG(p.img)} alt="" {...(settle ? { variants: photoV(p.fit) } : null)} />
        <div className="mp-pager"><i className="on"/><i/><i className="sm"/><i className="xs"/></div>
        <div className="mp-kebab"><img src={IMG('73447.svg')} alt=""/></div>
      </div>
      <Bottom className="mp-bottom">
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
      </Bottom>
    </div>
  );
}

export default function MotionPanel({ fixedStyle, fixedMode, chrome = true }) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [style, setStyle] = useState(fixedStyle || 'morph'); // harness picker drives this
  const [mode, setMode] = useState(fixedMode || 'wait');     // wait | popLayout
  const reduce = useReducedMotion();

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
  const select = (i) => { if (i===active) return; launchRef.current = null; setDir(Math.sign(i-active)); setActive(i); };

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
  /* Column-aware stagger for V3/V4. V1/V2 stagger by row, so on Home decor
     (one row) and Sneakers (one card) their choreography never shows. Walking
     the columns as well puts a ripple on every collection. Rows are ordered by
     direction exactly like rowDelay. */
  const gridDelay = (i, n, colStep, rowStep) => {
    if (reduce) return 0;
    const rows = Math.ceil(n / COLS), row = Math.floor(i / COLS), col = i % COLS;
    return col * colStep + (dir > 0 ? row : rows - 1 - row) * rowStep;
  };

  /* V3 · Reveal. Each card is uncovered in place by an edge travelling in the
     scroll direction — from the bottom when you go down the rail, from the top
     when you go up — rippling across the columns. Nothing travels or scales.
     clip-path is the sanctioned fourth property; `round 12px` keeps the card's
     corners during the wipe. 340ms, not the skill recipe's 600ms: that recipe
     is for marketing reveals, and this is a control you use. The grid itself
     doesn't fade in — a fade would wash out the edge while it's travelling. */
  /* The edge is FEATHERED: the cell is masked by a gradient whose soft 22%
     band travels across it (--rv), so the new card dissolves in behind a soft
     edge rather than a hard line. --rv runs 0% -> 122% so the band ends past
     the card; at rest the value is dropped (transitionEnd) and the mask falls
     away, so nothing stays composited once the reveal is done. The gradient's
     direction comes from --rdir, set per cell at render, which is safe: it is
     only read on the way IN. */
  const revealGridV = {
    enter: { opacity:1, filter:'blur(0px)' },
    center: { opacity:1, filter:'blur(0px)' },
    exit: { opacity:0, filter: reduce ? 'blur(0px)' : 'blur(3px)', transition:{ duration:0.16, ease:EASE_OUT } },
  };
  const revealCardV = {
    enter: reduce ? { opacity:0 } : { '--rv':'0%' },
    center: ({ delay }) => (reduce
      ? { opacity:1, transition:{ opacity:{ duration:0.2, delay } } }
      : { '--rv':'122%', transition:{ '--rv':{ duration:0.42, ease:EASE_OUT, delay } }, transitionEnd:{ '--rv':'none' } }),
  };

  /* V4 · Photo. Cards fade in where they stand; inside each, the photo settles
     and then the text arrives (photoV / bottomV above). An 8px grid hint
     carries direction. */
  const photoGridV = {
    enter: (d) => ({ opacity:0, y: reduce ? 0 : (d > 0 ? 8 : -8), filter:'blur(0px)' }),
    center: { opacity:1, y:0, filter:'blur(0px)', transition:{ opacity:{ duration:0.2 }, y:{ ...SPRING } } },
    exit: { opacity:0, filter: reduce ? 'blur(0px)' : 'blur(3px)', transition:{ duration:0.16, ease:EASE_OUT } },
  };
  const photoCardV = {
    enter: { opacity:0 },
    center: ({ delay }) => ({ opacity:1,
      transition:{ opacity:{ duration:0.26, ease:EASE_OUT, delay }, delayChildren: delay } }),
  };

  const ROW_STAGGER = style === 'slideDepth' ? 0.045 : 0.055;
  const rowDelay = (i, n) => {
    if (reduce) return 0;
    const rows = Math.ceil(n / COLS), row = Math.floor(i / COLS);
    return (dir > 0 ? row : rows - 1 - row) * ROW_STAGGER;
  };

  const isSharedGrid = style === 'morph' || style === 'bloom';
  /* Per-style grid + card choreography for the staggered family. */
  const STAGGERED = {
    slide:      { grid: slideV,      card: cardV,       delay: (i, n) => rowDelay(i, n) },
    slideDepth: { grid: slideDepthV, card: cardDepthV,  delay: (i, n) => rowDelay(i, n) },
    reveal:     { grid: revealGridV, card: revealCardV, delay: (i, n) => gridDelay(i, n, 0.02, 0.03), reveal: true },
    photo:      { grid: photoGridV,  card: photoCardV,  delay: (i, n) => gridDelay(i, n, 0.02, 0.025), settle: true },
  };
  const per = STAGGERED[style];
  const unfurl = !!per;
  /* V3/V4 overlap the outgoing and incoming grids instead of running them in
     sequence. Under mode="wait" the filmstrip showed ~120ms of completely empty
     stage between them. Neither version travels, so an overlap reads as a
     cross-dissolve rather than two grids colliding — and in V3 the new cards
     wipe in over the old ones, which is what a wipe should be. V1/V2 keep
     "wait": their travel needs the old grid gone first. */
  const gridMode = (style === 'reveal' || style === 'photo') ? 'popLayout' : mode;

  /* ---- rail selection ----
     `pos` is the fractional collection index the white selection row sits at.
     It springs to `active` on every switch, on the same spring as the grid. */
  const pos = useMotionValue(0);
  const railTransform = useTransform(pos, (v) => `translateY(${(v * RAIL_ROW_H).toFixed(2)}px)`);
  React.useEffect(() => {
    const c = animate(pos, active, reduce ? { duration:0 } : SPRING);
    return () => c.stop();
  }, [active]);

  /* ---- the blue marker: stretch, then contract ----
     Two ends on two springs, both heading for the new folder. The lead lands
     early, so the marker stretches to span the row it left and the row it is
     going to; the trail lands as the white row settles, contracting it back to
     22px exactly as the switch finishes. Whichever end is ahead is the lead, so
     direction takes care of itself: min() is the top, max() the bottom. A
     second switch mid-flight retargets both from where they are.

     Height is animated directly rather than scaleY: stretching a 4px bar 5x
     with scale smears its rounded end into a long taper. It is a tiny
     absolutely-positioned element with nothing laid out around it, so the cost
     is one small paint — the same exception the picker spec makes for width. */
  const edgeA = useMotionValue(0), edgeB = useMotionValue(0);
  React.useEffect(() => {
    if (reduce) { edgeA.set(active); edgeB.set(active); return; }
    const a = animate(edgeA, active, NOTCH_LEAD);
    const b = animate(edgeB, active, NOTCH_TRAIL);
    return () => { a.stop(); b.stop(); };
  }, [active]);
  const notchY = useTransform([edgeA, edgeB], ([a, b]) => `translateY(${(Math.min(a, b) * RAIL_ROW_H + NOTCH_TOP).toFixed(2)}px)`);
  const notchH = useTransform([edgeA, edgeB], ([a, b]) => Math.abs(a - b) * RAIL_ROW_H + NOTCH_H);

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
          <img className="mp-sel-corner mp-sel-corner-top" src={IMG('37a34.svg')} alt="" />
          <img className="mp-sel-corner mp-sel-corner-bot" src={IMG('37a34.svg')} alt="" />
        </motion.span>
        <motion.span className="mp-notch" aria-hidden style={{ transform: notchY, height: notchH }} />
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
            <AnimatePresence mode={gridMode} initial={false} custom={dir}>
              <motion.h1 key={col.id} className="mp-title" custom={dir}
                variants={titleV} initial="enter" animate="center" exit="exit">{col.name}</motion.h1>
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
        <motion.div className="mp-stage" layoutScroll ref={stageRef}>
        <div key={`${style}-${mode}`} className="mp-presence">
        {isSharedGrid ? (
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
            <AnimatePresence mode={gridMode} custom={dir} initial={false}>
              <motion.div key={col.id} className="mp-grid" custom={dir}
                variants={per ? per.grid : style==='depth' ? depthV : dissolveV}
                initial="enter" animate="center" exit="exit"
                onAnimationComplete={(d)=>{ if (d === 'center') setMoving(false); }}>
                {col.items.map((key,i)=> unfurl ? (
                  <motion.div key={i} className="mp-cell" variants={per.card}
                    custom={{ d: dir, delay: per.delay(i, col.items.length) }}
                    {...(per.reveal && !reduce ? { 'data-reveal': '', style: { '--rdir': dir > 0 ? 'to top' : 'to bottom' } } : null)}>
                    <CardInner p={PRODUCTS[key]} settle={!!per.settle} />
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
