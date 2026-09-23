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
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, useTransform, useVelocity, animate, motionValue } from 'framer-motion';

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
const RAIL_MIN_H = 400;   // V6 · Tray: the panel never gets shorter than the rail needs
const cardCentre=(i)=>[(i%COLS)*(CARD_W+GAP)+CARD_W/2, Math.floor(i/COLS)*ROW_PITCH+CARD_H/2];
/* Card-table styles: the grid always fits the stage, so it never scrolls and
   nothing needs the edge fade. Their cards tilt, stack and turn past the grid's
   edges, so the stage stops clipping for them (data-open) — no mask, no blur. */
const OPEN_STAGE = new Set(['deal', 'ribbon', 'flip', 'toss', 'origami', 'gooey', 'silhouette', 'depth2']);
const folderAnchor=(i)=>[THUMB_CX-GRID_LEFT, i*RAIL_ROW_H+RAIL_ROW_H/2-GRID_TOP];

const TRACK_GAP = 48, TRACK_SCALE = 0.75;   // V3 · Carousel (measured)
const SPRING = { type:'spring', stiffness:320, damping:28 };
/* JS_DRIVEN — pass as onUpdate to any element whose opacity animates.
   Motion hands opacity/filter/transform to the browser's WAAPI when it can;
   when that animation finishes it is removed a frame before Motion writes the
   final value, so for one frame the element falls back to its initial inline
   style — opacity 0. Measured: every entering card in V2/V4–V6 blinked out
   for one frame at the end of its fade. Any onUpdate handler makes Motion
   drive the element itself, which commits every frame: no blink. */
const JS_DRIVEN = () => {};   // motion-lab slide
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
/* ---- TAB DELIGHT START ----
   Selecting a tab makes its folder hop: the cover card is kicked up, the two
   wings follow 40ms later and splay out a touch as they lift (follow-through —
   loose cards trailing the one you grabbed), then everything lands with one
   small dip and settles. The folder being put down gets a 1px settle.

   Physics, not a keyframe curve: every channel (x, y, rotation) is a damped
   spring and a hop is an impulse — a kick to its velocity. A second switch
   mid-hop reads the channel's live position AND velocity and kicks again from
   there, so rapid switching adds up like real bounces instead of restarting
   or stacking.

   The springs are sampled into WAAPI keyframes on the individual `translate`
   and `rotate` properties. Those compose with — never replace — the
   `transform` the hover rules set, and they run on the compositor. Nothing is
   added to the markup, and at rest both properties are `none` again. */
const HOP = { w: 15, z: 0.42 };          // ω rad/s, damping ratio: 1 dip of ~24%, no second bounce you can see
const HOP_DT = 1 / 60, HOP_MAX = 0.8;    // sample step and sampled length (s); past ~0.5s the tail is < 0.3px, by 0.8s < 0.05px
/* Visual centre minus the transform-origin, per card, from the rest matrices
   (`e,f` of .mp-fan-l/-r/-mid). `rotate` pivots on the origin, so a rotation
   is paired with the translate that keeps each card turning about its own
   centre, the way the hover tilt does. */
const HOP_ARM = { l: [-27.567, -21.469], r: [-5.197, -21.469], mid: [-18.332, -24.109] };
/* Peak offsets. y is px (negative = up), x px, r deg. 68px fan — a 4px hop is
   a 7% jump, clearly a hop without leaving the row. */
const HOP_SELECT = {
  mid: { d: 0,    x: 0,    y: -4,   r: -1.5 },  // the cover tips as it lifts, like the hover
  l:   { d: 0.04, x: -1.5, y: -3,   r: -4 },
  r:   { d: 0.04, x: 1.5,  y: -3,   r: 4 },
};
const HOP_SETTLE = {                     // the folder you left: set down, 1px
  mid: { d: 0,    x: 0, y: 1,   r: 0 },
  l:   { d: 0.02, x: 0, y: 0.8, r: 0 },
  r:   { d: 0.02, x: 0, y: 0.8, r: 0 },
};
const hopWd = HOP.w * Math.sqrt(1 - HOP.z * HOP.z);
// Free response of the spring from (x0, v0) after t seconds.
const hopFree = (x0, v0, t) => {
  const e = Math.exp(-HOP.z * HOP.w * t);
  return e * (x0 * Math.cos(hopWd * t) + ((v0 + HOP.z * HOP.w * x0) / hopWd) * Math.sin(hopWd * t));
};
// The kick that makes a spring at rest peak at exactly 1.
const HOP_UNIT = (() => {
  const tp = Math.atan(hopWd / (HOP.z * HOP.w)) / hopWd;
  return 1 / hopFree(0, 1, tp);
})();

function useTabHop(fanRef, selected, reduce, quiet) {
  const prev = React.useRef(selected);
  const live = React.useRef(new Map());   // card el -> { anim, f(t) -> [x,y,r] }
  React.useEffect(() => {
    const was = prev.current; prev.current = selected;
    const fan = fanRef.current;
    if (was === selected || !fan) return;           // mount, or no change
    // Scroll switches stay still (Saransh: hop on selection, not while
    // scrolling); quiet is true when the switch came from the wheel.
    if (quiet && quiet()) return;
    if (reduce) {
      // No movement: the new folder just brightens in.
      if (selected) fan.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
      return;
    }
    const plan = selected ? HOP_SELECT : HOP_SETTLE;
    for (const k of ['l', 'r', 'mid']) {
      const el = fan.querySelector('.mp-fan-' + k); if (!el) continue;
      const p = plan[k], [ax, ay] = HOP_ARM[k];
      // Where this card is right now, and how fast it is moving.
      const old = live.current.get(el);
      let s0 = [0, 0, 0], v0 = [0, 0, 0];
      if (old && old.anim.playState === 'running') {
        const t = (old.anim.currentTime || 0) / 1000, a = old.f(t), b = old.f(t + 0.001);
        s0 = a; v0 = a.map((v, i) => (b[i] - v) / 0.001);
        old.anim.cancel();
      }
      const kick = [p.x, p.y, p.r].map((v) => v * HOP_UNIT);
      const f = (t) => [0, 1, 2].map((i) =>
        hopFree(s0[i], v0[i], t) + (t > p.d ? hopFree(0, kick[i], t - p.d) : 0));
      const frames = [];
      for (let t = 0; t < HOP_MAX - 1e-9; t += HOP_DT) {
        const [x, y, r] = f(t);
        // Pivot fix: rotating about the origin swings the centre by (I−R)·arm.
        const c = Math.cos(r * Math.PI / 180), sn = Math.sin(r * Math.PI / 180);
        const fx = x + (ax - (ax * c - ay * sn)), fy = y + (ay - (ax * sn + ay * c));
        frames.push({ translate: `${fx.toFixed(3)}px ${fy.toFixed(3)}px`, rotate: `${r.toFixed(3)}deg` });
      }
      frames.push({ translate: '0px 0px', rotate: '0deg' });
      const anim = el.animate(frames, { duration: HOP_MAX * 1000, easing: 'linear' });
      live.current.set(el, { anim, f });
    }
  }, [selected, reduce]);
}
/* ---- TAB DELIGHT END ---- */

function FolderPreview({ items, selected, quiet }) {                 // TAB DELIGHT: + selected
  const img = (i, fallback) => (items[i] ? PRODUCTS[items[i]].img : fallback);
  const fanRef = React.useRef(null);                           // TAB DELIGHT
  useTabHop(fanRef, selected, useReducedMotion(), quiet);             // TAB DELIGHT
  return (
    <span className="mp-fan" aria-hidden ref={fanRef}>{/* TAB DELIGHT: ref */}
      <span className="mp-fan-card mp-fan-l"><span className="mp-fan-master"><img src={IMG(img(1, FAN_FILL[0]))} alt="" /></span></span>
      <span className="mp-fan-card mp-fan-r"><span className="mp-fan-master"><img src={IMG(img(2, FAN_FILL[1]))} alt="" /></span></span>
      <span className="mp-fan-card mp-fan-mid"><span className="mp-fan-master"><img src={IMG(img(0, FAN_FILL[0]))} alt="" /></span></span>
    </span>
  );
}

/* `parts` (V4 · Layered only): variants for the photo, the text block and the
   buttons, so a card can arrive in layers — photo drifting inside its frame,
   then name/price, then the actions. They inherit the cell's enter/center
   labels through variant propagation; without `parts` the card is static. */
function CardInner({ p, parts }) {
  const Img = parts ? motion.img : 'img';
  const Info = parts ? motion.div : 'div';
  const Acts = parts ? motion.div : 'div';
  return (
    <div className="mp-card">
      <div className="mp-top">
        <Img className="mp-photo" data-fit={p.fit} src={IMG(p.img)} alt="" {...(parts ? { variants: parts.photo, onUpdate: JS_DRIVEN } : null)} />
        <div className="mp-pager"><i className="on"/><i/><i className="sm"/><i className="xs"/></div>
        <div className="mp-kebab"><img src={IMG('73447.svg')} alt=""/></div>
      </div>
      <div className="mp-bottom">
        <Info style={{display:'flex',flexDirection:'column',gap:6}} {...(parts ? { variants: parts.info, onUpdate: JS_DRIVEN } : null)}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <p className="mp-name">{p.name}</p>
            <span className="mp-rating"><img src={IMG('1a53e.svg')} alt=""/><b>4.3</b><em>(128)</em></span>
          </div>
          <div className="mp-price"><span className="mp-sell" data-ligatures="on">{'dhm'+p.sell}</span><span className="mp-listed">{p.list}</span><span className="mp-disc">33%</span></div>
          <img className="mp-eta" src={IMG('97c5c.svg')} alt="Express, today"/>
        </Info>
        <Acts className="mp-actions" {...(parts ? { variants: parts.cta, onUpdate: JS_DRIVEN } : null)}>
          <span className="mp-btnP"><img src={IMG('d85fd.svg')} alt=""/>Add to cart</span>
          <span className="mp-btnI"><img src={IMG('7394a.svg')} alt=""/></span>
        </Acts>
      </div>
    </div>
  );
}

/* ---- V3 · Carousel as a real track ----
   All three sections live on one vertical strip, one after another with a
   48px gap, and the strip itself is the only thing that animates. Each
   section's scale and opacity are pure functions of where the strip is, so a
   switch made mid-flight simply retargets the strip from wherever it is: two
   sections can never land on the same spot. (The previous version animated
   each section in and out on its own; reversing mid-flight reused the exiting
   section from its exit position and the two stacked on top of each other —
   the "jumbled" cards.)
   Motion is unchanged, measured off Saransh's reference: one curve,
   cubic-bezier(0.3, 0.05, 0.05, 1) over 0.9s; a section one pitch from the
   centre sits at 0.75 and grows linearly to 1 as it arrives; scale is anchored
   on the section's left edge so it stays aligned to the rail. */
const sectionH = (n) => { const r = Math.max(1, Math.ceil(n / COLS)); return r * CARD_H + (r - 1) * GAP; };
const TRACK_OFFS = (() => { let o = 0; return COLLECTIONS.map((c) => { const at = o; o += sectionH(c.items.length) + TRACK_GAP; return at; }); })();
const TRACK_EASE = { duration: 0.9, ease: [0.3, 0.05, 0.05, 1] };

function TrackSection({ k, c, y, on }) {
  // Progress away from the centre, 0 (in place) … 1 (one pitch away). The
  // pitch is the distance to the neighbour on the side the section is on.
  const prog = (v) => {
    const dist = TRACK_OFFS[k] + v;
    const pitch = dist > 0 ? TRACK_OFFS[k] - TRACK_OFFS[k - 1] : sectionH(c.items.length) + TRACK_GAP;
    return Math.min(1, Math.abs(dist) / pitch);
  };
  const scale = useTransform(y, (v) => 1 - (1 - TRACK_SCALE) * prog(v));
  // Fully visible for the first 40% of the way out, then fading, so a short
  // section never sits half-visible above or below the one in place.
  const opacity = useTransform(y, (v) => Math.max(0, Math.min(1, 1 - (prog(v) - 0.4) / 0.6)));
  return (
    <motion.div className="mp-track-sec" aria-hidden={!on}
      style={{ top: TRACK_OFFS[k], scale, opacity, pointerEvents: on ? 'auto' : 'none' }}>
      <div className="mp-grid">
        {c.items.map((key, i) => <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>)}
      </div>
    </motion.div>
  );
}

function CarouselTrack({ active, reduce, onSettle }) {
  const y = useMotionValue(-TRACK_OFFS[active]);
  React.useEffect(() => {
    // Reduced motion: no travel, the switch is instant.
    if (reduce) { y.set(-TRACK_OFFS[active]); onSettle(); return; }
    // Tween from wherever the strip is right now, so an interruption is a
    // retarget, not a restart.
    const a = animate(y, -TRACK_OFFS[active], TRACK_EASE);
    // Release the edge fade while the strip is still gliding in (it's ~95%
    // there at 0.58s), so the fade dissolves as the cards settle instead of
    // waiting for the curve's last pixels and vanishing after.
    const t = setTimeout(onSettle, 480);
    return () => { a.stop(); clearTimeout(t); };
  }, [active]);
  return (
    <motion.div className="mp-track" style={{ y, height: sectionH(COLLECTIONS[active].items.length) }}>
      {COLLECTIONS.map((c, k) => <TrackSection key={c.id} k={k} c={c} y={y} on={k === active} />)}
    </motion.div>
  );
}

/* ---- VARIANT A START ---- */
/* V4 · Stack — the collections are sheets in a pile, first one on top, and
   the rail walks down through it. Going to the next collection peels the top
   sheet off: it lifts up and away on the scroll's own velocity, casting a
   shadow on the sheet beneath, which comes forward out of the pile (a touch
   small and low, growing to full size as it's uncovered). Going back lays the
   sheet down again on top: it drops in from above, its shadow tightening as
   it touches down, while the one it covers settles back into the pile.
   Like the carousel it is one derived piece: a single motion value `p` (the
   fractional collection index) and every sheet's y, scale, opacity and shadow
   are pure functions of it, so an interruption is a retarget of `p` and the
   pile can never be out of order. Sheets always paint first-on-top; each has
   an opaque white backing, so the one on top genuinely covers the one below
   instead of the two double-exposing. At rest the backing is white on white
   with no shadow — invisible, the page looks exactly as before. */
const STACK_SINK = 0.05;      // a sheet one deep sits at 0.95 …
const STACK_DROP = 18;        // … and 18px lower, like a pile seen from above
const STACK_RAISE = 1.012;    // a peeled sheet comes up toward you a hair
const STACK_VEIL = 0.05;      // the pile sits in the top sheet's shade
const STACK_SPRING = { type:'spring', visualDuration:0.48, bounce:0 };
// A peeled sheet travels its full height (plus its paper and shadow), so it
// leaves the stage completely: the sheet beneath is genuinely uncovered, never
// seen through a half-faded one.
const stackLift = (k) => sectionH(COLLECTIONS[k].items.length) + 16 + 40;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function StackSheet({ k, c, p, on, reduce }) {
  const L = stackLift(k);
  // o < 0: peeled (above the pile), 0: on top, o > 0: in the pile.
  const y = useTransform(p, (v) => { if (reduce) return 0; const o = k - v; return o < 0 ? Math.max(-1, o) * L : Math.min(1, o) * STACK_DROP; });
  const scale = useTransform(p, (v) => { if (reduce) return 1; const o = k - v;
    return o < 0 ? 1 + (STACK_RAISE - 1) * Math.min(1, -o) : 1 - STACK_SINK * Math.min(1, o); });
  // Nothing fades. Sheets in the pile are hidden by the paper on top, and a
  // peeled sheet stays solid all the way off the stage — fading it on the way
  // out double-exposed its last strip over the sheet it had just uncovered.
  // Opacity only switches a sheet off once it is fully off-stage or buried.
  // Reduced motion: nothing moves; the sheet on top simply fades over the one
  // beneath, which holds solid so the crossfade never dips toward blank.
  const opacity = useTransform(p, (v) => { const o = k - v;
    if (reduce) return o < 0 ? clamp01(1 + o) : (o < 1 ? 1 : 0);
    return o > -0.999 && o < 1.5 ? 1 : 0; });
  // The cast shadow belongs to a sheet in the air: it builds in the first
  // fifth of the lift and is gone the moment the sheet is flat on the pile.
  const shade = useTransform(p, (v) => { const o = k - v; return reduce || o >= 0 ? 0 : Math.min(1, -o * 5); });
  // A sheet under the top one is in its shade; it brightens as it's uncovered.
  const veil = useTransform(p, (v) => { const o = k - v; return reduce || o <= 0 ? 0 : STACK_VEIL * Math.min(1, o); });
  return (
    <motion.div className="mp-stack-sheet" aria-hidden={!on}
      style={{ y, scale, opacity, zIndex: COLLECTIONS.length - k, pointerEvents: on ? 'auto' : 'none' }}>
      <div className="mp-stack-back"><motion.span className="mp-stack-shade" style={{ opacity: shade }} /></div>
      <div className="mp-grid">
        {c.items.map((key, i) => <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>)}
      </div>
      <motion.span className="mp-stack-veil" style={{ opacity: veil }} />
    </motion.div>
  );
}

function StackDeck({ active, reduce, launch, onSettle }) {
  const p = useMotionValue(active);
  const from = React.useRef(active);
  React.useEffect(() => {
    if (reduce) {
      const a = animate(p, active, { duration: 0.2, ease: EASE_OUT });
      const t = setTimeout(onSettle, 200);
      return () => { a.stop(); clearTimeout(t); };
    }
    // A scroll flick hands its speed over: the peeled sheet (the old one going
    // down, the new one coming back up) leaves at the speed the content was
    // moving. launch.v is px/s, positive = content moving down.
    const v = launch.current?.v;
    const peeled = active > from.current ? from.current : active;
    from.current = active;
    // animate() on a moving value keeps its current velocity, so a second
    // switch mid-flight bends the pile's motion rather than restarting it.
    const opts = v ? { ...STACK_SPRING, velocity: -v / stackLift(peeled) } : STACK_SPRING;
    const a = animate(p, active, opts);
    let done = false;
    const off = p.on('change', (x) => { if (!done && Math.abs(x - active) < 0.05) { done = true; onSettle(); } });
    const t = setTimeout(() => { if (!done) { done = true; onSettle(); } }, 600);
    return () => { a.stop(); off(); clearTimeout(t); };
  }, [active]);
  return (
    <div className="mp-stack" style={{ height: sectionH(COLLECTIONS[active].items.length) }}>
      {COLLECTIONS.map((c, k) => <StackSheet key={c.id} k={k} c={c} p={p} on={k === active} reduce={reduce} />)}
    </div>
  );
}
/* ---- VARIANT A END ---- */

/* ==== V4 · Liquid Tab and V5 · Spring Chain: the page as one document ====
   Both lay every collection out as a chapter of one tall document — its own
   heading, then its rows — so the heading travels WITH its cards instead of
   cross-fading on its own (the panel's header is hidden for these styles).
   Only displacement is animated; each chapter fades by its distance from the
   stage top the way V3's sections do, so neighbours never sit half-visible. */
const DOC_HEAD = 52;                       // 32px heading + 20px to the grid
const DOC_GAP = 48;                        // between chapters
const docH = (k) => DOC_HEAD + sectionH(COLLECTIONS[k].items.length);
const DOC_OFFS = (() => { let o = 0; return COLLECTIONS.map((c, k) => { const at = o; o += docH(k) + DOC_GAP; return at; }); })();
const docRows = (k) => Math.max(1, Math.ceil(COLLECTIONS[k].items.length / COLS));
// A chapter one pitch away is fully faded; fully visible for the first 40%.
const docOpacity = (k, top) => {
  // Below its place: the pitch to the chapter above. Above it — or the first
  // chapter overshooting downward, which has nothing above — its own pitch.
  const pitch = top > 0 && k > 0 ? DOC_OFFS[k] - DOC_OFFS[k - 1] : docH(k) + DOC_GAP;
  const p = Math.min(1, Math.abs(top) / pitch);
  return Math.max(0, Math.min(1, 1 - (p - 0.4) / 0.6));
};
function DocHeading({ c }) { return <h2 className="mp-title mp-doc-title">{c.name}</h2>; }
function DocRow({ c, r }) {
  return (
    <div className="mp-grid">
      {c.items.slice(r * COLS, r * COLS + COLS).map((key, i) => <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>)}
    </div>
  );
}

/* ---- V4 · Liquid Tab ----
   The selected tab and its page are one white body. The tab is drawn as a
   single SVG shape from two ends on two springs: the lead races to the new
   row, the trail follows with a little give, so while they're apart the white
   stretches between the rows and pinches into a neck that stays joined to the
   page, then snaps together. The page is driven by the SAME two springs: the
   chapter you're leaving goes with the lead (it's pulled away first), the one
   you're arriving at comes with the trail (it's drawn in behind), so the page
   opens a gap exactly while the tab is stretched and closes it as the tab
   snaps shut — one body, one motion. */
/* No bounce (Saransh, 24 Sep): both ends ride V3's curve,
   cubic-bezier(0.3, 0.05, 0.05, 1) — soft start, long glide, no overshoot —
   the lead over 0.62s and the trail over the full 0.9s, so the tab still
   stretches (the lead gets there first) and closes as the trail arrives. */
const LIQ_CURVE = [0.3, 0.05, 0.05, 1];
const LIQ_LEAD  = { duration:0.62, ease:LIQ_CURVE };
const LIQ_TRAIL = { duration:0.9,  ease:LIQ_CURVE };
const LIQ_RELEASE = { duration:0.34, ease:[0.23, 1, 0.32, 1] };   // scroll pull letting go
const LIQ_R = 20;                                                 // the inverted corners
/* The tab outline for ends a/b (row indices). At rest it is exactly .mp-sel —
   a 280×96 row with the two inverted corners into the page. Stretched, each
   end keeps a 36px cap with its outer left corner rounding off, and the
   left edge between the caps pinches in: a neck up to 150px deep, always
   joined to the page on the right. */
function liquidPath(a, b) {
  const T = Math.min(a, b) * RAIL_ROW_H, B = Math.max(a, b) * RAIL_ROW_H + RAIL_ROW_H;
  const s = Math.max(0, (B - T - RAIL_ROW_H) / RAIL_ROW_H);       // 0 at rest, 1 per row apart
  const r = Math.min(16, 48 * s), w = Math.min(150, 190 * Math.sqrt(s));
  const cap = 36, y1 = T + cap, y2 = B - cap, m = (T + B) / 2;
  const f = (n) => n.toFixed(2);
  const left = s < 0.002 ? `L0,${f(T)} L0,${f(B)}` :
    `L${f(r)},${f(T)} Q0,${f(T)} 0,${f(T + r)} L0,${f(y1)} ` +
    `C0,${f(y1 + (m - y1) * 0.6)} ${f(w)},${f(m - (m - y1) * 0.4)} ${f(w)},${f(m)} ` +
    `C${f(w)},${f(m + (y2 - m) * 0.4)} 0,${f(y2 - (y2 - m) * 0.6)} 0,${f(y2)} ` +
    `L0,${f(B - r)} Q0,${f(B)} ${f(r)},${f(B)}`;
  return `M280,${f(T - LIQ_R)} A${LIQ_R},${LIQ_R} 0 0 1 ${280 - LIQ_R},${f(T)} ${left} ` +
         `L${280 - LIQ_R},${f(B)} A${LIQ_R},${LIQ_R} 0 0 1 280,${f(B + LIQ_R)} Z`;
}
/* The blue marker stays the usual stretching bar on top (same two ends, same
   springs). Clipping it to the shape was tried: the neck swallowed almost all
   of it and it read as broken specks. */
function LiquidTab({ a, b }) {
  const d = useTransform([a, b], ([x, y]) => liquidPath(x, y));   // a already includes the scroll pull
  const h = COLLECTIONS.length * RAIL_ROW_H + 2 * LIQ_R;
  return (
    <svg className="mp-liquid" aria-hidden="true" width="280" height={h} viewBox={`0 ${-LIQ_R} 280 ${h}`}>
      <motion.path d={d} fill="#fff" />
    </svg>
  );
}
/* The page pours through the tab: while a chapter moves, its rail side leads
   — a skew about its right edge, so the cards nearest the tab are dragged
   ahead as if drawn through the neck, up to 3° (~46px across the grid) at full
   speed — and it stretches a touch along the travel. Both come from the
   chapter's own velocity, so they grow with speed, relax as it brakes, and
   the trail spring's small overshoot swings them back through zero: the
   jelly settle as it lands. */
const LIQ_SKEW_PER = 1 / 1600, LIQ_SKEW_MAX = 3;
function LiquidSection({ k, c, y, on }) {
  const opacity = useTransform(y, (v) => docOpacity(k, DOC_OFFS[k] + v));
  const vy = useVelocity(y);
  const skewY = useTransform(vy, (v) => Math.max(-LIQ_SKEW_MAX, Math.min(LIQ_SKEW_MAX, -v * LIQ_SKEW_PER)));
  const scaleY = useTransform(vy, (v) => 1 + Math.min(0.04, Math.abs(v) / 120000));
  return (
    <motion.div className="mp-doc-link mp-liquid-sec" aria-hidden={!on}
      style={{ top: DOC_OFFS[k], y, skewY, scaleY, opacity, pointerEvents: on ? 'auto' : 'none' }}>
      <DocHeading c={c} />
      {Array.from({ length: docRows(k) }, (_, r) => <div key={r} style={{ marginTop: r ? GAP : 0 }}><DocRow c={c} r={r} /></div>)}
    </motion.div>
  );
}
function LiquidTrack({ active, reduce, launch, onSettle }) {
  const ys = React.useMemo(() => COLLECTIONS.map(() => motionValue(-DOC_OFFS[active])), []);
  const from = React.useRef(active);
  React.useEffect(() => {
    const T = -DOC_OFFS[active], dir = Math.sign(active - from.current);
    from.current = active;
    if (reduce || !dir) { ys.forEach((y) => y.set(T)); onSettle(); return; }
    // Chapters on the side you're leaving ride the lead; the target and what's
    // beyond it ride the trail. Decided per switch from where they are now,
    // so a reversal mid-flight re-assigns without a jump.
    const anims = ys.map((y, k) => animate(y, T, (k - active) * dir < 0 ? LIQ_LEAD : LIQ_TRAIL));
    const t = setTimeout(onSettle, 520);
    return () => { anims.forEach((x) => x.stop()); clearTimeout(t); };
  }, [active]);
  return (
    <div className="mp-doc" style={{ height: docH(active) }}>
      {COLLECTIONS.map((c, k) => <LiquidSection key={c.id} k={k} c={c} y={ys[k]} on={k === active} />)}
    </div>
  );
}

/* ---- V5 · Spring Chain ----
   Every heading and every row is a link in one chain, pulled from the front
   link of the chapter you're leaving (its heading going down the rail, its
   last row going up) on a firm, nearly critically damped spring. Each link
   behind it hangs back in proportion to the chain's speed — the further down
   the chain, the more slack — up to a fixed limit per link, and that slack is
   itself a slightly under-damped spring. So the page sets off as one body
   whose gaps open as it gathers speed, then, as it brakes, the slack
   overshoots and the links gently bunch up before settling: stretch, then
   compress, like a real chain. Slack is capped (28px a link) and the bunching
   stays well inside the 20px gaps, so links can never cross — an unbounded
   spring chain let them trail by hundreds of px on a 1000px trip.
   Simulated per frame (4 sub-steps); a new switch moves the pull point and
   target, and positions and velocities carry on. */
const CHAIN_PULL  = { k: 260, c: 30 };     // the pull: ζ ≈ 0.93
const CHAIN_SLACK = { k: 300, c: 12 };     // the slack: ζ ≈ 0.35, the follow-through
const CHAIN_TAU = 0.009;                   // s of lag per link behind the pull
const CHAIN_MAX = 28;                      // px of slack per link, at most
const CHAIN_LINKS = COLLECTIONS.flatMap((c, k) => [
  { k, head: true, top: DOC_OFFS[k] },
  ...Array.from({ length: docRows(k) }, (_, r) => ({ k, r, top: DOC_OFFS[k] + DOC_HEAD + r * ROW_PITCH })),
]);
const CHAIN_HEAD_OF = COLLECTIONS.map((c, k) => CHAIN_LINKS.findIndex((l) => l.k === k && l.head));
function ChainLink({ link, c, y, headY, on }) {
  const opacity = useTransform(headY, (v) => docOpacity(link.k, DOC_OFFS[link.k] + v));
  return (
    <motion.div className="mp-doc-link" aria-hidden={!on}
      style={{ top: link.top, y, opacity, pointerEvents: on ? 'auto' : 'none' }}>
      {link.head ? <DocHeading c={c} /> : <DocRow c={c} r={link.r} />}
    </motion.div>
  );
}
function ChainTrack({ active, reduce, launch, onSettle }) {
  const n = CHAIN_LINKS.length;
  const ys = React.useMemo(() => CHAIN_LINKS.map(() => motionValue(-DOC_OFFS[active])), []);
  const sim = React.useRef(null);
  if (!sim.current) sim.current = { x: -DOC_OFFS[active], v: 0, lag: Array(n).fill(0), lv: Array(n).fill(0),
    rank: Array(n).fill(0), T: -DOC_OFFS[active], raf: 0, last: 0, from: active };
  React.useEffect(() => {
    const st = sim.current, dir = Math.sign(active - st.from);
    st.T = -DOC_OFFS[active];
    const commit = () => ys.forEach((y, i) => y.set(st.x + st.lag[i]));
    if (reduce || !dir) { st.x = st.T; st.v = 0; st.lag.fill(0); st.lv.fill(0); commit(); st.from = active; onSettle(); return; }
    const own = CHAIN_LINKS.map((l, i) => i).filter((i) => CHAIN_LINKS[i].k === st.from);
    const P = dir > 0 ? own[0] : own[own.length - 1];
    st.from = active;
    // Links behind the pull (in the direction of travel) carry slack, one
    // more link's worth each; links ahead of it ride rigidly.
    st.rank = CHAIN_LINKS.map((_, i) => Math.max(0, (i - P) * dir));
    const v0 = launch.current?.v;
    if (v0) st.v += v0;
    const tick = (now) => {
      const dt = Math.min(1 / 30, (now - (st.last || now)) / 1000); st.last = now;
      const h = dt / 4;
      for (let s = 0; s < 4; s++) {
        st.v += (CHAIN_PULL.k * (st.T - st.x) - CHAIN_PULL.c * st.v) * h;
        st.x += st.v * h;
        for (let i = 0; i < n; i++) {
          const r = st.rank[i];
          const want = r ? -Math.max(-CHAIN_MAX * r, Math.min(CHAIN_MAX * r, st.v * CHAIN_TAU * r)) : 0;
          st.lv[i] += (CHAIN_SLACK.k * (want - st.lag[i]) - CHAIN_SLACK.c * st.lv[i]) * h;
          st.lag[i] += st.lv[i] * h;
        }
      }
      let busy = Math.abs(st.x - st.T) > 0.3 || Math.abs(st.v) > 4;
      for (let i = 0; i < n && !busy; i++) if (Math.abs(st.lag[i]) > 0.3 || Math.abs(st.lv[i]) > 4) busy = true;
      if (!busy) { st.x = st.T; st.v = 0; st.lag.fill(0); st.lv.fill(0); }
      commit();
      st.raf = busy ? requestAnimationFrame(tick) : 0;
    };
    cancelAnimationFrame(st.raf); st.last = 0; st.raf = requestAnimationFrame(tick);
    const t = setTimeout(onSettle, 560);
    return () => clearTimeout(t);
  }, [active]);
  React.useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);
  return (
    <div className="mp-doc" style={{ height: docH(active) }}>
      {CHAIN_LINKS.map((l, i) => <ChainLink key={i} link={l} c={COLLECTIONS[l.k]} y={ys[i]} headY={ys[CHAIN_HEAD_OF[l.k]]} on={l.k === active} />)}
    </div>
  );
}
/* ==== end V4 / V5 ==== */

/* ==== V7 · Word Morph ====
   The heading morphs letter by letter (Family's "Continue" → "Confirm"): the
   letters the two names share — longest common subsequence, in order — slide
   to their new places on one spring; the rest dissolve out upward and resolve
   in from below, blurred to sharp. The grid does the same at card scale:
   a card showing the same product photo in both collections glides to its
   new slot (layout animation) and keeps living; the others dissolve out and
   resolve in where they stand. Heading and cards share the spring. */
const MORPH_SPRING = { type:'spring', visualDuration:0.5, bounce:0.12 };
let morphUid = 0;
const lcsPairs = (a, b) => {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return pairs;
};
let measureCtx = null;
const glyphXs = (text, font) => {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = font; measureCtx.letterSpacing = '-0.25px';
  return [...text].map((_, i) => measureCtx.measureText(text.slice(0, i)).width);
};
function TitleMorph({ name, reduce }) {
  const reg = React.useRef(null);
  const h1 = React.useRef(null);
  const [font, setFont] = React.useState('700 22px Noontree, sans-serif');
  React.useLayoutEffect(() => {
    if (h1.current) { const cs = getComputedStyle(h1.current); setFont(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`); }
    document.fonts?.ready?.then(() => setFont((f) => f + ' '));   // re-measure once the webfont is in
  }, []);
  const letters = React.useMemo(() => {
    const chars = [...name];
    const prev = reg.current;
    const next = chars.map((ch) => ({ ch, key: null }));
    if (prev) {
      const A = prev.filter((l) => l.ch !== ' '), Bi = chars.map((c, i) => i).filter((i) => chars[i] !== ' ');
      lcsPairs(A.map((l) => l.ch), Bi.map((i) => chars[i])).forEach(([ai, bj]) => { next[Bi[bj]].key = A[ai].key; });
    }
    next.forEach((l) => { if (!l.key) l.key = 'g' + (++morphUid); });
    reg.current = next;
    return next;
  }, [name]);
  const xs = React.useMemo(() => glyphXs(name, font.trim()), [name, font]);
  const t = reduce ? { duration: 0 } : MORPH_SPRING;
  return (
    <h1 ref={h1} className="mp-title mp-title-morph" aria-label={name}>
      <AnimatePresence initial={false}>
        {letters.map((l, i) => l.ch === ' ' ? null : (
          <motion.span key={l.key} className="mp-morph-ch" aria-hidden="true" onUpdate={JS_DRIVEN}
            initial={{ x: xs[i], y: reduce ? 0 : 7, opacity: 0, filter: reduce ? 'blur(0px)' : 'blur(6px)' }}
            animate={{ x: xs[i], y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: reduce ? 0 : -7, opacity: 0, filter: reduce ? 'blur(0px)' : 'blur(6px)', transition: { duration: 0.2, ease: EASE_OUT } }}
            transition={{ x: t, y: t, opacity: { duration: 0.24, ease: EASE_OUT, delay: 0.06 }, filter: { duration: 0.32, ease: EASE_OUT, delay: 0.06 } }}>
            {l.ch}
          </motion.span>
        ))}
      </AnimatePresence>
      <span className="mp-morph-sizer" aria-hidden="true">{name}</span>
    </h1>
  );
}
/* A card's identity across collections is its photo (and which occurrence of
   it), so Sneakers' shoe — same photo as the Nautica card — morphs too. */
const morphIds = (items) => { const seen = {}; return items.map((k) => { const im = PRODUCTS[k].img; seen[im] = (seen[im] || 0) + 1; return `${im}#${seen[im]}`; }); };
/* ==== end V7 ==== */

/* ==== V6 · Origami ====
   The page is one sheet of paper — heading and cards together. A switch
   folds it up like an accordion: the sheet is cut into ~260px strips, every
   other crease tipping toward you and away, the faces tilting out of the
   light shading darker, until the whole page is a thin folded packet at the
   top. At that instant — edge-on, invisible — the new collection is printed on
   the same sheet, and it unfolds back down on a spring with enough give that
   the paper overshoots flat and flexes back once before it settles.
   All of it is one number, the fold angle θ: each strip's position, depth,
   tilt and shade derive from it, so a switch mid-fold just re-targets θ —
   folding from wherever the sheet is — and the sheet can never tear. */
const FOLD_H = 260, FOLD_MAX = 84;
const foldGeom = (k) => { const total = DOC_HEAD + sectionH(COLLECTIONS[k].items.length); const S = Math.max(1, Math.round(total / FOLD_H)); return { total, S, H: total / S }; };
function FoldStrip({ c, k, j, S, H, theta }) {
  const odd = j % 2 === 1;
  const transform = useTransform(theta, (t) => {
    const r = t * Math.PI / 180;
    // Creases fold AWAY from the viewer (even strips tip back, odd ones come
    // forward from that depth), so perspective shrinks the packet toward the
    // vanishing point instead of swelling it over the rail.
    return `translateY(${(j * H * Math.cos(r) - j * H).toFixed(2)}px) translateZ(${(odd ? -H * Math.sin(r) : 0).toFixed(2)}px) rotateX(${(odd ? t : -t).toFixed(3)}deg)`;
  });
  // Faces turning away from the light darken; the ones facing it barely.
  const shade = useTransform(theta, (t) => Math.abs(Math.sin(t * Math.PI / 180)) * (odd ? 0.32 : 0.1));
  return (
    <motion.div className="mp-fold-strip" style={{ top: j * H, height: H, transform }}>
      <div className="mp-fold-inner" style={{ transform: `translateY(${-j * H}px)` }}>
        <DocHeading c={c} />
        {Array.from({ length: docRows(k) }, (_, r) => <div key={r} style={{ marginTop: r ? GAP : 0 }}><DocRow c={c} r={r} /></div>)}
      </div>
      <motion.div className="mp-fold-shade" style={{ opacity: shade }} />
    </motion.div>
  );
}
function OrigamiTrack({ active, reduce, launch, onSettle }) {
  const [shown, setShown] = useState(active);
  const theta = useMotionValue(0);
  const token = React.useRef(0);
  React.useEffect(() => {
    if (active === shown && theta.get() === 0) return;
    const my = ++token.current;
    if (reduce) { setShown(active); theta.set(0); onSettle(); return; }
    const flick = !!launch.current?.v;           // a scroll flick folds faster
    (async () => {
      // Folded to 84°, not 90: a thin packet of paper stays in view while the
      // new collection is printed on it (at 90° it vanished for a frame).
      const left = (FOLD_MAX - theta.get()) / FOLD_MAX;
      if (left > 0.01) await animate(theta, FOLD_MAX, { duration: Math.max(0.08, (flick ? 0.22 : 0.3) * left), ease: [0.5, 0, 0.9, 0.5] });
      if (my !== token.current) return;
      setShown(active);
      // From rest: inheriting the fold's closing speed drove θ past 90° (to
      // 109°) and the strips turned their backs — the page blanked for 100ms.
      await animate(theta, 0, { type: 'spring', visualDuration: 0.55, bounce: 0.3, velocity: 0 });
      if (my === token.current) onSettle();
    })();
  }, [active]);
  const g = foldGeom(shown), c = COLLECTIONS[shown];
  return (
    <div className="mp-fold" style={{ height: g.total }}>
      {Array.from({ length: g.S }, (_, j) => <FoldStrip key={`${shown}-${j}`} c={c} k={shown} j={j} S={g.S} H={g.H} theta={theta} />)}
    </div>
  );
}
/* ==== end V6 ==== */

/* ---- GOOEY START ---- */
/* V4 · Gooey Merge — the page is one substance. On a switch the cards'
   content dissolves and what is left is liquid: every card is a bead in one
   signed-distance field whose blend radius swells, so the gutters fill and
   the grid runs together into a single sheet. The sheet flows to the new
   layout — a card with no slot in it pours into its nearest neighbour, a card
   the new layout needs is drawn out of one — and as the blend relaxes the
   sheet tears back into cards, the new content resolving on each as it lands.
   There are only ever seven beads (the largest collection). A card that isn't
   shown is a bead parked inside its nearest shown card, invisible in the
   union, so nothing appears or disappears: beads only merge and split.
   Each bead's four edges run on their own springs; the edge leading in the
   direction of travel is stiffer than the trailing one, so a moving bead
   stretches and then contracts (the rail's blue marker does the same). The
   rail's direction is a current through the whole sheet: down the rail every
   bead first reaches up (the old content flows out of the top) and the new
   cards settle up into place from below; up the rail, the mirror image.
   A switch only retargets springs from where they are, velocity kept, so an
   interruption bends the flow instead of restarting it.
   Rendering: one WebGL quad under the grid, drawn only while switching. At
   rest it is display:none and the grid is the plain grid. */
const GOO_N = Math.max(...COLLECTIONS.map((c) => c.items.length));
const GOO_PAD = 32;          // canvas bleed around the grid, for the current's reach
const GOO_W = COLS * CARD_W + (COLS - 1) * GAP + 2 * GOO_PAD;
const GOO_H = Math.max(...COLLECTIONS.map((c) => sectionH(c.items.length))) + 2 * GOO_PAD;
const GOO_R = 12, GOO_ROUND = 56;   // corner radius at rest / extra at full melt: a melting card softens
const GOO_K = 80;            // blend radius at full melt (px): 20px gutters fuse solid
const GOO_BEAD = 14;         // px each side a card draws in as it melts — beads, not a slab
const GOO_PARK = 0.1;        // a parked bead is its host inset 10% a side
const GOO_DELAY = 0.06, GOO_ROW = 0.045;   // s: content dissolves in place first; then rows, along the rail
const GOO_LEAD = 20, GOO_TRAIL = 14, GOO_ZETA = 0.96;   // edge springs (rad/s)
const GOO_M_IN = 17, GOO_M_OUT = 16;                    // melt spring (rad/s)
const GOO_REACH = 18, GOO_REACH_MS = 150, GOO_SAG = 18; // the current (px, ms)
const GOO_FLING = 0.5;       // share of a scroll flick's speed the sheet carries into the switch
const GOO_HOLD = 230;        // ms the melt holds even if nothing travels
const GOO_ARRIVE = 40;       // px: beads this close to landing let the melt go
const GOO_OUT = 0.09, GOO_IN = 0.16;   // content fade floors (s, full swing)
const GOO_FILL = '0.933,0.941,0.961', GOO_SHADE = 0.06;  // #eef0f5; a faint bevel, lit from the top left
const gooRect = (i) => { const x = (i % COLS) * (CARD_W + GAP), y = Math.floor(i / COLS) * ROW_PITCH; return [x, y, x + CARD_W, y + CARD_H]; };
const gooHost = (i, n) => {
  if (i < n) return i;
  const c = gooRect(i); let best = 0, bd = Infinity;
  for (let j = 0; j < n; j++) { const r = gooRect(j); const d = Math.hypot(r[0] - c[0], r[1] - c[1]); if (d < bd - 1e-6) { bd = d; best = j; } }
  return best;
};
const gooTarget = (i, n) => {
  const r = gooRect(gooHost(i, n));
  if (i < n) return r;
  const ix = CARD_W * GOO_PARK, iy = CARD_H * GOO_PARK;
  return [r[0] + ix, r[1] + iy, r[2] - ix, r[3] - iy];
};
const gooClamp = (v) => Math.max(0, Math.min(1, v));
const gooSmooth = (a, b, x) => { const t = gooClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const GOO_VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const GOO_FS = `precision highp float;
uniform vec4 uR[${GOO_N}];uniform float uK,uDpr,uH,uRad;
float sd(vec2 p,vec4 r){vec2 c=(r.xy+r.zw)*.5;vec2 h=max((r.zw-r.xy)*.5,vec2(0.));float rad=min(uRad,min(h.x,h.y));
  vec2 q=abs(p-c)-h+rad;return length(max(q,0.))+min(max(q.x,q.y),0.)-rad;}
float field(vec2 p){float k=max(uK,1e-3);float d=1e5;
  for(int i=0;i<${GOO_N};i++){float di=sd(p,uR[i]);float h=clamp(.5+.5*(d-di)/k,0.,1.);d=mix(d,di,h)-k*h*(1.-h);}
  return d;}
void main(){vec2 p=vec2(gl_FragCoord.x,uH-gl_FragCoord.y)/uDpr-${GOO_PAD.toFixed(1)};float d=field(p);
  if(d>1.){gl_FragColor=vec4(0.);return;}
  float lit=clamp((field(p+vec2(-3.,-4.))-d)/5.,-1.,1.)*smoothstep(-20.,0.,d);
  vec3 col=vec3(${GOO_FILL})*(1.+${GOO_SHADE}*lit);
  col=mix(col,vec3(.878,.894,.925),smoothstep(-1.6,-.2,d)*.7);
  float a=clamp(.5-d*uDpr,0.,1.);gl_FragColor=vec4(col*a,a);}`;

function gooGL(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;
  const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, GOO_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GOO_FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(pr, n);
  const uR = u('uR'), uK = u('uK'), uDpr = u('uDpr'), uH = u('uH'), uRad = u('uRad');
  const R = new Float32Array(GOO_N * 4);
  return (rects, k, dpr, rad) => {
    rects.forEach((r, i) => R.set(r, i * 4));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4fv(uR, R); gl.uniform1f(uK, k); gl.uniform1f(uDpr, dpr); gl.uniform1f(uH, canvas.height); gl.uniform1f(uRad, rad);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

// A scalar spring toward `to` (critically damped), stepped in place.
const gooSpring = (o, to, w, dt) => { o.v += (-w * w * (o.x - to) - 2 * w * o.v) * dt; o.x += o.v * dt; };

function GooeyMerge({ active, dir, launch, onSettle }) {
  const rootRef = React.useRef(null), canvasRef = React.useRef(null), gridRef = React.useRef(null);
  const [shown, setShown] = useState(active);
  const S = React.useRef(null);
  if (!S.current) {
    const n = COLLECTIONS[active].items.length;
    S.current = {
      beads: Array.from({ length: GOO_N }, (_, i) => {
        const t = gooTarget(i, n);
        return { e: t.slice(), v: [0, 0, 0, 0], t, w: [GOO_LEAD, GOO_LEAD, GOO_LEAD, GOO_LEAD], next: null, at: 0, park: i >= n, host: gooRect(gooHost(i, n)) };
      }),
      melt: { x: 0, v: 0 }, reach: { x: 0, v: 0 }, sag: { x: 0, v: 0 },
      rects: [], op: [], t0: 0, dir: 1, active, shown: active, raf: 0, last: 0, draw: null, dpr: 1, swapping: false,
    };
  }
  const s = S.current;
  s.onSettle = onSettle;

  // The shape each bead is drawn at this frame: its springs, drawn in as it
  // melts, and pulled along the current.
  const shape = (b) => {
    const m = gooClamp(s.melt.x), bead = GOO_BEAD * m;
    const up = s.dir > 0 ? GOO_REACH * s.reach.x : GOO_SAG * s.sag.x;     // top edge, outward
    const down = s.dir > 0 ? GOO_SAG * s.sag.x : GOO_REACH * s.reach.x;   // bottom edge, outward
    return [b.e[0] + bead, b.e[1] + bead - up, b.e[2] - bead, b.e[3] - bead + down];
  };

  // Content rides its bead and fades with it. Written straight to the DOM:
  // this runs every frame and must not re-render React.
  const writeCells = React.useCallback((rest) => {
    const g = gridRef.current; if (!g) return;
    [...g.children].forEach((el, i) => {
      if (rest) { el.style.transform = ''; el.style.opacity = ''; return; }
      const r = s.rects[i], h = gooRect(i);
      const sx = Math.max(0, (r[2] - r[0]) / CARD_W), sy = Math.max(0, (r[3] - r[1]) / CARD_H);
      const tx = (r[0] + r[2] - h[0] - h[2]) / 2, ty = (r[1] + r[3] - h[1] - h[3]) / 2;
      el.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      el.style.opacity = (s.op[i] ?? 1).toFixed(3);
    });
  }, []);

  const frame = React.useCallback((now) => {
    const dt = Math.min(0.04, Math.max(0, (now - (s.last || now)) / 1000)); s.last = now;
    const steps = Math.max(1, Math.ceil(dt / 0.004)), h = dt / steps;
    let far = 0, still = true;
    s.beads.forEach((b) => {
      if (b.next && now >= b.at) {
        const t = b.next; b.next = null;
        // lead/trail: the edge on the side the bead is heading is the stiff one
        const dx = (t[0] + t[2]) - (b.e[0] + b.e[2]), dy = (t[1] + t[3]) - (b.e[1] + b.e[3]);
        const mid = (GOO_LEAD + GOO_TRAIL) / 2;
        b.w = [dx < -1 ? GOO_LEAD : dx > 1 ? GOO_TRAIL : mid, dy < -1 ? GOO_LEAD : dy > 1 ? GOO_TRAIL : mid,
               dx > 1 ? GOO_LEAD : dx < -1 ? GOO_TRAIL : mid, dy > 1 ? GOO_LEAD : dy < -1 ? GOO_TRAIL : mid];
        b.t = t;
      }
      for (let k = 0; k < 4; k++) {
        const w = b.w[k];
        for (let j = 0; j < steps; j++) { b.v[k] += (-w * w * (b.e[k] - b.t[k]) - 2 * GOO_ZETA * w * b.v[k]) * h; b.e[k] += b.v[k] * h; }
        if (Math.abs(b.v[k]) > 6) still = false;
      }
      // How far a bead still is from landing. For a parked bead only what
      // still shows outside its host counts: inside it, it's already gone.
      const T = b.next || b.t, H = b.host;
      if (b.park) far = Math.max(far, H[0] - b.e[0], H[1] - b.e[1], b.e[2] - H[2], b.e[3] - H[3]);
      else for (let k = 0; k < 4; k++) far = Math.max(far, Math.abs(b.e[k] - T[k]));
      if (b.next) far = Math.max(far, GOO_ARRIVE + 1);
    });
    // Melt holds while anything is still travelling, then lets the sheet tear.
    const age = now - s.t0;
    const hold = age < GOO_HOLD || far > GOO_ARRIVE || s.shown !== s.active;
    gooSpring(s.melt, hold ? 1 : 0, hold ? GOO_M_IN : GOO_M_OUT, dt);
    gooSpring(s.reach, hold && age < GOO_REACH_MS ? 1 : 0, 18, dt);
    gooSpring(s.sag, hold && age >= GOO_REACH_MS ? 1 : 0, 12, dt);
    s.rects = s.beads.map(shape);
    // Content: out while the switch is pending, back in as its bead lands and the melt lets go.
    const nShown = COLLECTIONS[s.shown].items.length;
    let allOut = true, allIn = true;
    for (let i = 0; i < nShown; i++) {
      const b = s.beads[i], r = gooRect(i);
      const d = Math.max(...b.e.map((v, k) => Math.abs(v - r[k])));
      const want = s.shown !== s.active ? 0 : (1 - gooSmooth(0.08, 0.4, s.melt.x)) * (1 - gooSmooth(1, 10, d));
      const o = s.op[i] ?? 1;
      s.op[i] = want < o ? Math.max(want, o - dt / GOO_OUT) : Math.min(want, o + dt / GOO_IN);
      if (s.op[i] > 0.001) allOut = false;
      if (s.op[i] < 0.999) allIn = false;
    }
    if (s.shown !== s.active && allOut && !s.swapping) { s.swapping = true; setShown(s.active); }
    const quiet = [s.melt, s.reach, s.sag].every((o) => Math.abs(o.x) < 0.05 && Math.abs(o.v) < 0.5);
    if (!hold && quiet && still && far < 1 && allIn && s.shown === s.active) {
      s.beads.forEach((b) => { b.e = b.t.slice(); b.v = [0, 0, 0, 0]; });
      [s.melt, s.reach, s.sag].forEach((o) => { o.x = 0; o.v = 0; });
      s.op = []; s.raf = 0; s.last = 0;
      writeCells(true);
      rootRef.current?.removeAttribute('data-live');
      s.onSettle?.();
      return;
    }
    writeCells(false);
    s.draw?.(s.rects, GOO_K * gooClamp(s.melt.x), s.dpr, GOO_R + GOO_ROUND * gooClamp(s.melt.x));
    s.raf = requestAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    const cv = canvasRef.current;
    s.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(GOO_W * s.dpr); cv.height = Math.round(GOO_H * s.dpr);
    s.draw = gooGL(cv);   // no WebGL: the content still rides and fades, without the liquid
    // Draw once now, hidden, so the shader is compiled before the first switch.
    s.draw?.(s.beads.map((b) => b.e), 0, s.dpr, GOO_R);
    return () => { cancelAnimationFrame(s.raf); s.raf = 0; };
  }, []);

  // A switch retargets every bead from wherever it is; rows go in the
  // direction of travel — down the rail the top row moves first.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    const now = performance.now(), n = COLLECTIONS[active].items.length, rows = Math.ceil(GOO_N / COLS);
    s.active = active; s.t0 = now; s.dir = dir;
    // A scroll flick hands its speed over (px/s, + = content moving down):
    // the sheet lurches with the gesture, then the springs take it home.
    const fling = (launch?.current?.v || 0) * GOO_FLING;
    s.beads.forEach((b, i) => {
      b.v[1] += fling; b.v[3] += fling;
      const row = Math.floor(i / COLS);
      b.next = gooTarget(i, n); b.park = i >= n; b.host = gooRect(gooHost(i, n));
      b.at = now + (GOO_DELAY + (dir > 0 ? row : rows - 1 - row) * GOO_ROW) * 1000;
    });
    if (!s.raf) { s.last = 0; s.rects = s.beads.map(shape); rootRef.current?.setAttribute('data-live', ''); s.raf = requestAnimationFrame(frame); }
  }, [active]);

  // New cards mount at their bead's opacity, before paint — never at 1.
  React.useLayoutEffect(() => { s.shown = shown; s.swapping = false; if (s.raf) { s.op = new Array(GOO_N).fill(0); writeCells(false); } }, [shown]);

  return (
    <div className="mp-goo" ref={rootRef}>
      <canvas ref={canvasRef} className="mp-goo-canvas" aria-hidden />
      <div className="mp-grid" ref={gridRef}>
        {COLLECTIONS[shown].items.map((key, i) => <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>)}
      </div>
    </div>
  );
}

/* Reduced motion: no liquid, no travel — a plain 200ms crossfade. */
function GooeyFade({ active }) {
  const [ghost, setGhost] = useState(null);
  const last = React.useRef(active), nonce = React.useRef(0), mounted = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setGhost({ k: last.current, n: ++nonce.current }); last.current = active;
  }, [active]);
  const cells = (k) => COLLECTIONS[k].items.map((key, i) => <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>);
  return (
    <div className="mp-goo">
      {ghost && (
        <motion.div key={'g' + ghost.n} className="mp-grid mp-goo-ghost" aria-hidden onUpdate={JS_DRIVEN}
          initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'linear' }}
          onAnimationComplete={() => setGhost((g) => (g && g.n === ghost.n ? null : g))}>{cells(ghost.k)}</motion.div>
      )}
      <motion.div key={active} className="mp-grid" onUpdate={JS_DRIVEN}
        initial={nonce.current ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: 'linear' }}>{cells(active)}</motion.div>
    </div>
  );
}
/* ---- GOOEY END ---- */

/* ---- SILHOUETTE START ---- */
/* V · Silhouette Morph — the page's shape morphs, then its content.
   Under the grid sits one soft silhouette per slot (at most 7). At rest they
   are hidden and exactly under the cards. On a switch the old cards fade to
   their silhouettes, every silhouette dilates by 10px — the 20px gutters
   close and the grid reads as ONE merged shape (seam corners go square,
   outer corners grow 12 → 22, which is the true offset of a 12px corner) —
   that shape morphs into the new collection's layout, then contracts back
   into card-sized pieces as the new cards fade in over them.
   Geometry is split in two so an interruption is always a retarget:
     • base  — each slot's card rect (x, y, w, h) plus how "outer" each of its
               four corners is (0 seam … 1 outer). Morphs layout → layout.
     • m     — one global merge amount (0 cards … 1 merged) that dilates every
               rect and squares the seams.
   A slot the layout doesn't have sits exactly on its anchor (the nearest slot
   it does have, same rect, same corners), so it emerges from / is absorbed
   into the block rather than popping. Because every slot shares one curve,
   neighbours overlap at least as fast as a corner rounds, so the merged shape
   never shows a notch at a seam. */
const SIL_E = 10;                    // dilation: half the gutter, neighbours touch
const SIL_R = 12;                    // the card's own radius
const SIL_MAX = 7;
const SIL_MORPH = [0.77, 0, 0.175, 1];
const SIL_T = {
  out: 0.12,                         // old cards fade to silhouettes
  merge: 0.2,                        // gutters close (m 0 → 1)
  morphAt: 0.1, morph: 0.48,         // the shape travels (0.48 for the longest trip, ~550px)
  lag: 0.05,                         // direction bias: the trailing row starts this much later
  release: 0.2,                      // gutters reopen (m 1 → 0), overlaps morph end
  inDur: 0.18,                       // new cards fade in over their silhouettes
};
// Interruptions retarget on a spring, which keeps the shape's velocity.
const SIL_RETARGET = { type:'spring', bounce:0 };
// Short trips take less time, so the shape never sits merged after arriving.
const silReach = (dist) => Math.min(1, dist / 550);
const silRows = (n) => Math.max(1, Math.ceil(n / COLS));
const silLastCol = (n, r) => (r < silRows(n) - 1 ? COLS - 1 : (n - 1) % COLS);
const silHas = (n, r, c) => r >= 0 && c >= 0 && c < COLS && r * COLS + c < n;
// The nearest slot the layout has: same row if it exists, else the last row;
// never further right than that row's last card.
const silAnchor = (s, n) => {
  if (s < n) return s;
  const r = Math.min(Math.floor(s / COLS), silRows(n) - 1);
  return r * COLS + Math.min(s % COLS, silLastCol(n, r));
};
// Outer-ness of a present slot's corners [tl, tr, br, bl] in layout n: a corner
// is on the merged shape's outline only if neither neighbour it touches exists.
const silCorners = (a, n) => {
  const r = Math.floor(a / COLS), c = a % COLS, h = (dr, dc) => silHas(n, r + dr, c + dc);
  return [!h(0, -1) && !h(-1, 0), !h(0, 1) && !h(-1, 0), !h(0, 1) && !h(1, 0), !h(0, -1) && !h(1, 0)].map(Number);
};
const silTarget = (s, n) => {
  const a = silAnchor(s, n);
  return { x: (a % COLS) * (CARD_W + GAP), y: Math.floor(a / COLS) * ROW_PITCH, c: silCorners(a, n) };
};

function SilRect({ sv, m, so }) {
  const x = useTransform([sv.x, m], ([v, k]) => v - SIL_E * k);
  const y = useTransform([sv.y, m], ([v, k]) => v - SIL_E * k);
  const width = useTransform(m, (k) => CARD_W + 2 * SIL_E * k);
  const height = useTransform(m, (k) => CARD_H + 2 * SIL_E * k);
  // Outer corners grow with the dilation (12 → 22); seams square off (12 → 0).
  const rad = (c) => useTransform([c, m], ([o, k]) => o * (SIL_R + SIL_E * k) + (1 - o) * SIL_R * (1 - k));
  const r0 = rad(sv.c[0]), r1 = rad(sv.c[1]), r2 = rad(sv.c[2]), r3 = rad(sv.c[3]);
  return (
    <motion.span className="mp-silo-rect" aria-hidden onUpdate={JS_DRIVEN}
      style={{ x, y, width, height, opacity: so,
        borderTopLeftRadius: r0, borderTopRightRadius: r1, borderBottomRightRadius: r2, borderBottomLeftRadius: r3 }} />
  );
}

/* Concave fillets. The union of rounded rects has soft outer corners but a
   sharp inner one wherever a row is shorter than the one above (the step at
   the bottom right of seven cards) or where two moving slots don't line up.
   Each frame, every rect corner that has exactly three of its four quadrants
   covered is an inner corner; a small square in the open quadrant, painted
   in the silhouette colour minus a circle, rounds it off. Its size is capped
   by the two edges it sits on (so it shrinks to nothing as a step closes —
   no pops) and grows in only once the gutters have actually closed. */
const SIL_FILLET = 20, SIL_FILLETS = 4;
const silRects = (m, raw) => {
  const out = [];
  for (let s = 0; s < SIL_MAX; s++) {
    const o = s * 6, x = raw[o], y = raw[o + 1], c = raw.slice(o + 2, o + 6);
    out.push({ x: x - SIL_E * m, y: y - SIL_E * m, w: CARD_W + 2 * SIL_E * m, h: CARD_H + 2 * SIL_E * m,
      r: c.map((k) => k * (SIL_R + SIL_E * m) + (1 - k) * SIL_R * (1 - m)) });
  }
  return out;
};
const silCornerIdx = (sx, sy) => (sy < 0 ? (sx < 0 ? 0 : 1) : (sx > 0 ? 2 : 3));
function silFillets([m, ...raw]) {
  const grow = Math.max(0, Math.min(1, (m - 0.95) / 0.05));
  if (!grow) return [];
  const R = silRects(m, raw), T = 1;   // coverage tolerance, px
  const hit = (px, py) => R.find((q) => px > q.x - T && px < q.x + q.w + T && py > q.y - T && py < q.y + q.h + T);
  const seen = new Set(), out = [];
  for (const a of R) for (const [px, py] of [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.h], [a.x, a.y + a.h]]) {
    const key = Math.round(px * 2) + ',' + Math.round(py * 2);
    if (seen.has(key)) continue; seen.add(key);
    const d = 2.5, open = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) if (!hit(px + sx * d, py + sy * d)) open.push([sx, sy]);
    if (open.length !== 1) continue;
    const [ux, uy] = open[0], ci = silCornerIdx(ux, uy);
    // The edge running along y = py into the open quadrant, and the one along x = px.
    const hq = R.filter((q) => px + ux * d > q.x && px + ux * d < q.x + q.w && py - uy * d > q.y && py - uy * d < q.y + q.h);
    const vq = R.filter((q) => px - ux * d > q.x && px - ux * d < q.x + q.w && py + uy * d > q.y && py + uy * d < q.y + q.h);
    if (!hq.length || !vq.length) continue;
    const lenX = Math.max(...hq.map((q) => (ux > 0 ? q.x + q.w - px : px - q.x) - q.r[ci]));
    const lenY = Math.max(...vq.map((q) => (uy > 0 ? q.y + q.h - py : py - q.y) - q.r[ci]));
    const f = Math.min(SIL_FILLET * grow, lenX, lenY);
    if (f > 0.5) out.push({ x: ux > 0 ? px : px - f, y: uy > 0 ? py : py - f, f, ux, uy });
    if (out.length === SIL_FILLETS) return out;
  }
  return out;
}
function SilFillet({ fs, i, so }) {
  const pick = (fn, dflt) => useTransform(fs, (l) => (l[i] ? fn(l[i]) : dflt));
  const x = pick((q) => q.x, 0), y = pick((q) => q.y, 0), size = pick((q) => q.f, 0);
  const background = pick((q) => `radial-gradient(circle ${q.f}px at ${q.ux > 0 ? '100%' : '0%'} ${q.uy > 0 ? '100%' : '0%'}, transparent ${Math.max(0, q.f - 0.8)}px, var(--sil-fill) ${q.f}px)`, 'none');
  const opacity = useTransform([fs, so], ([l, o]) => (l[i] ? o : 0));
  return <motion.span className="mp-silo-fillet" aria-hidden style={{ x, y, width: size, height: size, background, opacity }} />;
}

function SilGrid({ c, op, on }) {
  // Its own layer only while it fades, so the settled grid renders exactly
  // like every other version's.
  const willChange = useTransform(op, (v) => (v > 0 && v < 1 ? 'opacity' : 'auto'));
  return (
    <motion.div className="mp-grid mp-silo-grid" aria-hidden={!on} onUpdate={JS_DRIVEN}
      style={{ opacity: op, willChange, pointerEvents: on ? 'auto' : 'none', zIndex: on ? 2 : 1 }}>
      {c.items.map((key, i) => <div key={i} className="mp-cell"><CardInner p={PRODUCTS[key]} /></div>)}
    </motion.div>
  );
}

function SilhouetteMorph({ active, reduce, onSettle }) {
  const n0 = COLLECTIONS[active].items.length;
  const sv = React.useMemo(() => Array.from({ length: SIL_MAX }, (_, s) => {
    const t = silTarget(s, n0);
    return { x: motionValue(t.x), y: motionValue(t.y), c: t.c.map((v) => motionValue(v)) };
  }), []);
  const m = useMotionValue(0);      // merge amount
  const so = useMotionValue(0);     // silhouette layer opacity: 0 at rest
  const ops = React.useMemo(() => COLLECTIONS.map((_, k) => motionValue(k === active ? 1 : 0)), []);
  const fs = useTransform([m, ...sv.flatMap((v) => [v.x, v.y, ...v.c])], silFillets);
  const [shown, setShown] = useState([active]);
  const activeRef = React.useRef(active);
  const busy = React.useRef(false);  // base geometry in motion → retarget on a spring
  const first = React.useRef(true);

  React.useEffect(() => {
    const dir = Math.sign(active - activeRef.current), nPrev = COLLECTIONS[activeRef.current].items.length;
    activeRef.current = active;
    if (first.current) { first.current = false; return; }
    setShown((sh) => (sh.includes(active) ? sh : [...sh, active]));
    const n = COLLECTIONS[active].items.length;
    const anims = [], timers = [];
    // A faded-out grid unmounts, unless it has become the target again.
    const prune = () => setShown((sh) => sh.filter((k) => k === activeRef.current || ops[k].get() > 0.001));
    const snapBase = () => sv.forEach((v, s) => { const t = silTarget(s, n); v.x.set(t.x); v.y.set(t.y); v.c.forEach((cv, j) => cv.set(t.c[j])); });

    if (reduce) {
      // Plain 200ms crossfade; the silhouettes stay out of it.
      snapBase(); m.set(0); so.set(0);
      ops.forEach((o, k) => anims.push(animate(o, k === active ? 1 : 0, { duration: 0.2, ease: EASE_OUT })));
      timers.push(setTimeout(() => { prune(); onSettle(); }, 220));
      return () => { anims.forEach((a) => a.stop()); timers.forEach(clearTimeout); };
    }

    // Already merged (a switch mid-flight)? Then skip straight to the morph.
    const m0 = m.get();
    const mergeEnd = SIL_T.merge * (1 - m0);
    const morphAt = SIL_T.morphAt * (1 - m0);
    // Direction bias, only when there are two rows to bias: going down the
    // rail the bottom row leads and the shape flows upward; going up, the top
    // row leads and the shape pours downward. This order keeps the leading
    // row overlapping the trailing one, so seams stay closed.
    const twoRows = Math.max(n, nPrev) > COLS;
    const lagOf = (s) => (twoRows ? (dir > 0 ? 1 - Math.floor(s / COLS) : Math.floor(s / COLS)) * SIL_T.lag : 0);
    const retarget = busy.current;
    const left = () => Math.max(...sv.map((v, s) => { const t = silTarget(s, n); return Math.hypot(t.x - v.x.get(), t.y - v.y.get()); }));
    const dist = left();
    const dur = retarget ? 0.2 + 0.14 * silReach(dist) : SIL_T.morph - 0.1 * (1 - silReach(dist));

    so.set(1);   // under still-opaque cards: invisible until they fade
    // Every grid showing fades to its silhouettes — the target too, if a
    // reversal caught it mid-fade; it comes back once the shape has landed.
    ops.forEach((o, k) => {
      const v0 = o.get();
      if (v0 > 0) anims.push(animate(o, 0, { duration: SIL_T.out * Math.max(0.35, v0), ease: EASE_OUT, onComplete: k === active ? undefined : prune }));
    });
    if (m0 < 1) anims.push(animate(m, 1, { duration: mergeEnd, ease: [0.33, 0, 0.2, 1] }));

    const base = retarget ? { ...SIL_RETARGET, visualDuration: dur } : { duration: dur, ease: SIL_MORPH };
    busy.current = true;
    sv.forEach((v, s) => {
      const t = silTarget(s, n), opt = { ...base, delay: morphAt + lagOf(s) };
      anims.push(animate(v.x, t.x, opt), animate(v.y, t.y, opt));
      v.c.forEach((cv, j) => anims.push(animate(cv, t.c[j], opt)));
    });

    // Release when the shape has actually landed — merged, and within 5% of
    // the trip (or 4px) of its target — not at a predicted time: a retarget
    // spring that inherits the shape's speed arrives well before its nominal
    // duration, and a merged shape sitting still reads as a stall.
    const t0 = performance.now(), gate = (Math.max(mergeEnd, morphAt + (twoRows ? SIL_T.lag : 0)) + 0.02) * 1000;
    const near = Math.max(4, dist * 0.06);
    let raf = 0;
    const release = () => {
      busy.current = false;
      anims.push(animate(m, 0, { duration: SIL_T.release, ease: [0.6, 0, 0.3, 1] }));
      anims.push(animate(ops[active], 1, { delay: 0.03, duration: SIL_T.inDur, ease: EASE_OUT }));
      const inEnd = 0.03 + SIL_T.inDur;
      timers.push(setTimeout(() => anims.push(animate(so, 0, { duration: 0.06, ease: 'linear' })), (inEnd + 0.01) * 1000));
      timers.push(setTimeout(() => { prune(); onSettle(); }, (Math.max(SIL_T.release, inEnd) + 0.08) * 1000));
    };
    const watch = () => {
      if (performance.now() - t0 >= gate && left() <= near) { raf = 0; release(); return; }
      raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    return () => { cancelAnimationFrame(raf); anims.forEach((a) => a.stop()); timers.forEach(clearTimeout); };
  }, [active]);

  return (
    <div className="mp-silo" style={{ height: sectionH(n0) }}>
      {sv.map((v, s) => <SilRect key={s} sv={v} m={m} so={so} />)}
      {Array.from({ length: SIL_FILLETS }, (_, i) => <SilFillet key={i} fs={fs} i={i} so={so} />)}
      {shown.map((k) => <SilGrid key={COLLECTIONS[k].id} c={COLLECTIONS[k]} op={ops[k]} on={k === active} />)}
    </div>
  );
}
/* ---- SILHOUETTE END ---- */

/* ==== V5 · Depth (rebuilt 24 Sep) ====
   Real depth, tied to where you're going. Every collection sits at the same
   place at a different depth, and ONE value — p, the fractional collection
   index — says where the camera is. Going down the rail moves the camera
   deeper: the page you leave drifts toward you (to 1.04) and fades; the next
   one emerges from behind (0.94 → 1). Going up is the mirror: the page you
   leave sinks back, the previous one comes forward to meet you.
   What the first build got wrong, measured frame by frame: a ~100ms fog where
   both pages were blurred and half-visible at once; a 3.5% scale that the
   36px rise overpowered (it read as a blurry V1); a soft spring tail that
   crept the last 5px until ~580ms; and the same exit whichever way you went.
   So: the leaving page is gone by ~40% of the trip and is the only one with
   any blur (≤2px); the arriving page is sharp from its first frame and fully
   in by ~65%; no vertical travel — the depth is the motion; and one strong
   ease-out, cubic-bezier(0.23, 1, 0.32, 1) over 0.46s, that decelerates hard
   and stops clean. Deriving both pages from p means a switch mid-flight
   just re-aims the camera — nothing can double up or jumble. */
// Timing matches V3 (Saransh, 24 Sep: 0.46s was too quick to see the depth):
// V3's curve, cubic-bezier(0.3, 0.05, 0.05, 1) over 0.9s — soft start, long glide.
const DEPTH_EASE = { duration: 0.9, ease: [0.3, 0.05, 0.05, 1] };
const DEPTH_FLICK = DEPTH_EASE;
// Far 0.92 / near 1.045: a touch deeper than the first 0.94 / 1.04 (0.85 was
// too much travel). Depth is sold by light instead: the near page casts a
// soft shadow under its cards (--lift, 0 flat → 1 one step toward you).
const DEPTH_NEAR = 0.045, DEPTH_FAR = 0.08;
/* Depth cues beyond scale (24 Sep: "sell the depth more", without more
   travel): the page ahead is hazed like distance — a little desaturated and
   brighter — and clears as it arrives; each row sits at its own depth, the
   lower row travelling 30% further through it, so the page reads as layers in
   space; the page nearer than the panel casts a shadow under its cards. */
const DEPTH_ROW_SPREAD = 0.15;   // kept small: "I do not need much travel of the cards"
function DepthRow({ c, r, k, p }) {
  const f = 1 + r * DEPTH_ROW_SPREAD;
  const scale = useTransform(p, (v) => { const d = k - v, m = Math.min(1, Math.abs(d)) * f; return d < 0 ? 1 + DEPTH_NEAR * m : 1 - DEPTH_FAR * m; });
  return (
    <motion.div className="mp-depth-row" style={{ scale, top: r * ROW_PITCH, transformOrigin: `50% ${-r * ROW_PITCH}px` }}>
      <DocRow c={c} r={r} />
    </motion.div>
  );
}
function DepthLayer({ k, c, p, role, span }) {
  // Fades are measured as a share of the whole trip (span), so a jump across
  // two collections hands over exactly like a single step. The arriving page
  // starts at 5% and is full by 50%; the leaving one is gone by 45%.
  const opacity = useTransform(p, (v) => {
    const a = Math.abs(k - v) / span;
    if (role === 'to') return Math.max(0, Math.min(1, (0.95 - a) / 0.45));
    if (role === 'from') return Math.max(0, Math.min(1, 1 - a / 0.45));
    return a < 0.001 ? 1 : 0;
  });
  const lift = useTransform(p, (v) => { const d = k - v; return d < 0 ? Math.min(1, -d) : 0; });
  const filter = useTransform(p, (v) => {
    const d = k - v, m = Math.min(1, Math.abs(d));
    if (role === 'from') return `blur(${Math.min(2, m * 5).toFixed(2)}px)`;
    if (d > 0) return `saturate(${(1 - 0.35 * m).toFixed(3)}) brightness(${(1 + 0.06 * m).toFixed(3)})`;
    return 'none';
  });
  return (
    <motion.div className="mp-depth-layer" aria-hidden={role !== 'to'}
      style={{ opacity, filter, '--lift': lift, height: sectionH(c.items.length), zIndex: role === 'to' ? 2 : 1, pointerEvents: role === 'to' ? 'auto' : 'none' }}>
      {Array.from({ length: docRows(k) }, (_, r) => <DepthRow key={r} c={c} r={r} k={k} p={p} />)}
    </motion.div>
  );
}
function DepthTrack({ active, reduce, launch, onSettle }) {
  const p = useMotionValue(active);
  // Which page is leaving, decided in the same render as the switch. As
  // state set in an effect it arrived a render late, and the first frame
  // after a click had the old page with no role — opacity 0: a blank flash.
  const last = React.useRef(active), fromRef = React.useRef(active);
  if (last.current !== active) { fromRef.current = last.current; last.current = active; }
  const from = fromRef.current;
  const started = React.useRef(active);
  React.useEffect(() => {
    if (started.current === active) return;
    started.current = active;
    if (reduce) { p.set(active); onSettle(); return; }
    const a = animate(p, active, launch.current?.v ? DEPTH_FLICK : DEPTH_EASE);
    const t = setTimeout(onSettle, 600);
    return () => { a.stop(); clearTimeout(t); };
  }, [active]);
  return (
    <div className="mp-depth" style={{ height: sectionH(COLLECTIONS[active].items.length) }}>
      {COLLECTIONS.map((c, k) => (
        <DepthLayer key={c.id} k={k} c={c} p={p} span={Math.max(1, Math.abs(active - from))} role={k === active ? 'to' : k === from ? 'from' : null} />
      ))}
    </div>
  );
}
/* ==== end V5 · Depth ==== */

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
  const frameRef = React.useRef(null);
  // V4 · Liquid Tab: how far (in rows) an overscroll has pulled the tab.
  const liquidPull = useMotionValue(0);
  const activeRef = React.useRef(0);
  React.useEffect(() => { activeRef.current = active; }, [active]);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // One notch of a mouse wheel is ~100px and a deliberate trackpad flick
    // passes this within a few frames, so a genuine gesture always registers;
    // a stray one or two pixels of drift does not.
    const OVERSCROLL = 48;
    // Floor on the time between switches, independent of event spacing. The
    // quiet timer alone can re-arm mid-gesture if events arrive sparsely, and
    // one fling would then jump two collections. Nothing useful happens inside
    // this window anyway — the transition itself runs ~430ms.
    const MIN_GAP = 380;
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
      // No content movement on overscroll (Saransh: cards and labels shouldn't
      // nudge while scrolling). The band still exists as a value for the
      // liquid tab's pull; the page itself stays put.
      wrap?.style.setProperty('--rubber', '0px');
      // A pull displaces the content past the stage edge, so it clips there
      // exactly as a transition does — bring the fade in with it, scaled to how
      // far it has stretched. Without this the cards shear off mid-pull.
      wrap?.style.setProperty('--fade-pull', '0px');
      // V4 · Liquid Tab: the tab is pulled toward the next row like honey —
      // up to 0.42 of a row at the switch threshold, eased so it resists as
      // it stretches; at the ends (nothing to switch to) only a small bulge.
      if (style === 'liquid' && !reduce) {
        const f = Math.min(1, Math.abs(acc) / OVERSCROLL);
        // Only stop a running release. stop() on an idle value cut the
        // useTransform subscriptions downstream: the tab froze after the
        // first wheel event while the pull value kept climbing.
        if (liquidPull.isAnimating()) liquidPull.stop();
        liquidPull.set((cap === PULL ? 0.42 : 0.12) * (1 - (1 - f) * (1 - f)) * (down ? 1 : -1));
      }
    };
    const release = () => {
      // Liquid: let go and the stretched tab springs back — or, when the
      // switch fired, hands over to the lead end that is already on its way.
      if (style === 'liquid' && liquidPull.get() !== 0) animate(liquidPull, 0, LIQ_RELEASE);
      if (!wrap || wrap.style.getPropertyValue('--rubber') === '0px') return;
      wrap.setAttribute('data-release', '');
      wrap.style.setProperty('--rubber', '0px');
      wrap.style.setProperty('--fade-pull', '0px');
    };


    /* ---- gesture detection ----
       A switch disarms the wheel until the NEXT gesture starts, so one fling
       is one switch. The old rule — re-arm after 400ms of wheel silence — never
       fired on a trackpad: macOS momentum keeps sending wheel events for 1–2s,
       so a second flick inside that tail (or a flick back the other way) was
       swallowed and the panel felt stuck. A new gesture is now any of:
         · a pause   — no wheel event for 180ms (mouse notches, a fresh touch)
         · a reversal — ≥10px the other way (momentum never reverses)
         · a surge   — while coasting (5+ non-increasing deltas = momentum),
                       a delta more than twice the tail's floor + 6px: a finger
                       landing and flicking again on top of the decay.
       A gesture that crosses the threshold inside MIN_GAP of the last switch
       is queued and fires when the gap ends instead of being dropped. */
    const PAUSE = 180, REVERSE = 10;
    const g = { armed:true, acc:0, timer:0, last:0, first:0, lastT:0, lastSign:0,
                prevA:0, run:0, coast:false, floor:0, pending:0, speed:0 };
    // Every collection here fits the stage. Measure the grid's layout height
    // (offsetHeight ignores transforms): mid-transition the cards' transforms
    // inflate scrollHeight, the stage briefly looked scrollable, and a wheel
    // then scrolled the content instead of switching.
    const scrolls = () => { const p = el.querySelector('.mp-presence'); return !!p && p.offsetHeight > el.clientHeight + 2; };

    const fire = (down) => {
      const next = activeRef.current + (down ? 1 : -1);
      if (next < 0 || next >= COLLECTIONS.length) return;
      launchRef.current = { v: (down ? -1 : 1) * g.speed };
      release();
      g.armed = false; g.acc = 0; g.first = 0; g.last = performance.now(); g.coast = false;
      setDir(down ? 1 : -1);
      setActive(next);
      // Land on the edge you travelled towards, so the next overscroll in the
      // same direction is a fresh gesture rather than an instant re-trigger.
      if (scrolls()) requestAnimationFrame(() => requestAnimationFrame(() => {
        el.scrollTop = down ? 0 : el.scrollHeight;
      }));
    };

    const onWheel = (e) => {
      if (!e.deltaY) return;
      const now = performance.now();
      const a = Math.abs(e.deltaY), sign = Math.sign(e.deltaY), down = sign > 0;

      // Small opposite-direction wobble inside a gesture is ignored outright.
      const wobble = g.lastSign && sign !== g.lastSign && a < REVERSE && now - g.lastT < PAUSE;
      if (wobble) { e.preventDefault(); return; }

      const paused = now - g.lastT > PAUSE;
      const reversed = !paused && g.lastSign && sign !== g.lastSign;
      g.run = (!paused && !reversed && a <= g.prevA) ? g.run + 1 : 0;
      if (g.run >= 5 && !g.coast) { g.coast = true; g.floor = a; }
      if (g.coast) g.floor = Math.min(g.floor, a);
      const surged = g.coast && a > g.floor * 2 + 6;
      if (paused || reversed || surged) {
        g.armed = true; g.acc = 0; g.first = 0; g.coast = false; g.run = 0;
      }
      g.prevA = a; g.lastT = now; g.lastSign = sign;

      clearTimeout(g.timer);
      g.timer = setTimeout(() => { g.armed = true; g.acc = 0; g.coast = false; release(); }, PAUSE);

      // Over the rail or header there is no native scroll to hand the wheel
      // to, so the whole panel counts as being at an edge.
      const inStage = el.contains(e.target);
      const atEdge = !inStage || !scrolls() || (down
        ? el.scrollTop + el.clientHeight >= el.scrollHeight - 2
        : el.scrollTop <= 1);
      if (!atEdge) { g.acc = 0; release(); return; }
      e.preventDefault();
      if (!g.armed) return;

      if (!g.acc) g.first = now;
      g.acc += e.deltaY;
      const next = activeRef.current + (down ? 1 : -1);
      const atEnd = next < 0 || next >= COLLECTIONS.length;

      // Stretch while the gesture builds, and keep stretching — but never
      // switch — when there is nowhere further to go.
      if (atEnd || Math.abs(g.acc) < OVERSCROLL) {
        band(g.acc, down, atEnd ? PULL_END : PULL);
        return;
      }
      /* Hand the gesture's speed to the transition as spring velocity, capped
         at 1400px/s — measured: uncapped, a hard fling overshot 36px on a 44px
         travel; 1400 keeps a real gradient (4px gentle, 11px firm). The band
         is eased back over 280ms rather than snapped, so the outgoing grid
         doesn't teleport. */
      const dt = Math.max(16, now - (g.first || now));
      g.speed = Math.min(1400, Math.abs(g.acc) / dt * 1000);
      const wait = MIN_GAP - (now - g.last);
      g.armed = false; g.acc = 0;
      if (wait > 0) {
        // Too soon after the last switch: queue it rather than drop it.
        band(OVERSCROLL, down, PULL);
        clearTimeout(g.pending);
        g.pending = setTimeout(() => fire(down), wait);
        return;
      }
      fire(down);
    };

    const root = frameRef.current || el;
    root.addEventListener('wheel', onWheel, { passive:false });
    // Releasing on pointer-leave stops a stretched band hanging there if the
    // cursor leaves mid-gesture and no further wheel events arrive.
    root.addEventListener('pointerleave', release);
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerleave', release);
      clearTimeout(g.timer); clearTimeout(g.pending);
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
    // The carousel keeps its other sections laid out below the one in place
    // (hidden), which inflates scrollHeight; measure its layout box instead.
    const track = wrap.hasAttribute('data-track') && el.querySelector('.mp-presence');
    const remaining = (track ? track.offsetHeight : el.scrollHeight) - el.clientHeight - el.scrollTop;
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
    // V7 · Gooey never clips (the stage is open for it), so no edge fade.
    if (style === 'gooey') return;
    setMoving(true);
    // Cleared when the grid's own entrance reports done (onAnimationComplete
    // below); this is only the backstop for a style whose entrance never fires
    // one, and it is short so the band can't outlive the movement.
    const t = setTimeout(() => setMoving(false), (style === 'carousel' || style === 'stack' || style === 'liquid' || style === 'chain' || style === 'origami' || style === 'silhouette') ? 1100 : style === 'wordmorph' ? 620 : 340);
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
  /* Shared Slide parent: `travel` px of Y along the rail's direction, and an
     optional whole-grid scale (V1 passes 1 — pure travel). */
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
  const slideV = makeSlideV(44, 1);
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
  /* Title — a blur morph. The old and new names always overlap in the same
     spot (popLayout, whatever the grid does): the outgoing one dissolves into
     a 10px blur while the incoming one resolves out of it, so the heading reads
     as one word morphing into the next rather than one leaving and another
     arriving. It never moves — the heading holds its baseline. Slightly longer
     in than out so the new name is still sharpening as the old is gone. */
  const titleV = {
    enter:{ opacity:0, filter: reduce?'blur(0px)':'blur(10px)' },
    center:{ opacity:1, filter:'blur(0px)', transition:{ opacity:{ duration:0.3, ease:EASE_OUT }, filter:{ duration:0.42, ease:EASE_OUT } } },
    exit:{ opacity:0, filter: reduce?'blur(0px)':'blur(10px)', transition:{ opacity:{ duration:0.26, ease:EASE_OUT }, filter:{ duration:0.3, ease:EASE_OUT } } },
  };
  const dealTitleV = {
    enter:{ opacity:1 }, center:{ opacity:1 },
    exit:{ opacity:0, transition:{ duration:0.14, ease:EASE_OUT } },
  };
  const dealCharV = (i) => reduce ? {
    enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2, delay: 0.04 } },
  } : {
    enter:{ opacity:0, y:-5 },
    center:{ opacity:1, y:0, transition:{
      default:{ type:'spring', visualDuration:0.3, bounce:0, delay: 0.04 + i * 0.011 },
      opacity:{ duration:0.12, ease:EASE_OUT, delay: 0.04 + i * 0.011 } } },
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
  /* V2 · Depth — at SECTION level. The whole outgoing grid shrinks back and
     fades as one piece; the whole incoming grid rises from 0.90 to full scale,
     sharpening out of a slight blur. No per-card motion: the section is the
     object. (An earlier V2 put the depth on each card because a grid-wide 0.98
     was invisible across 880px — the fix was a scale you can see, not moving
     it onto the cards.) Scales toward the middle of the panel, not the grid's
     own centre, so a short collection recedes into the panel rather than
     toward a point beside itself; see depthOrigin. */
  const depthSectionV = {
    enter: { opacity:0, scale: reduce ? 1 : 0.9, filter: reduce ? 'blur(0px)' : 'blur(5px)' },
    center: { opacity:1, scale:1, filter:'blur(0px)', transition:{
      scale: reduce ? { duration:0 } : { type:'spring', stiffness:260, damping:30 },
      // opacity waits 50ms so the outgoing section is mostly gone before the
      // incoming one shows — an overlap, not a double exposure.
      opacity:{ duration:0.26, ease:EASE_OUT, delay: reduce ? 0 : 0.05 },
      filter:{ duration:0.3, ease:EASE_OUT } } },
    exit: { opacity:0, scale: reduce ? 1 : 0.95, filter: reduce ? 'blur(0px)' : 'blur(5px)', transition:{
      scale:{ duration:0.22, ease:EASE_OUT }, opacity:{ duration:0.16, ease:EASE_OUT }, filter:{ duration:0.18, ease:EASE_OUT } } },
  };
  /* V3 · Focus Pull. Nothing travels, nothing scales: a camera refocusing.
     The outgoing grid blurs out as a whole. The incoming one fades in QUICKLY
     (180ms) but keeps sharpening from 10px for 400ms — the fade has to finish
     well before the blur does, or it reads as a muddy crossfade instead of
     focus resolving. Section-level on purpose: a per-card trickle is what made
     the retired Reveal feel choppy. Blur lives on the grid container only;
     blurring seven card layers separately is the expensive way. */
  const focusV = {
    enter: { opacity:0, filter: reduce ? 'blur(0px)' : 'blur(10px)' },
    center: { opacity:1, filter:'blur(0px)', transition:{
      opacity:{ duration:0.18, ease:EASE_OUT, delay: reduce ? 0 : 0.08 },
      filter:{ duration:0.4, ease:EASE_OUT, delay: reduce ? 0 : 0.08 } } },
    exit: { opacity:0, filter: reduce ? 'blur(0px)' : 'blur(6px)', transition:{ duration:0.14, ease:EASE_OUT } },
  };

  /* V4 · Rail-anchored Bloom. The incoming grid grows 0.97 -> 1 from the grid's
     left edge at the HEIGHT OF THE FOLDER YOU CLICKED (bloomOrigin), and the
     cards fade in as a diagonal wave spreading out from that point. Content
     comes from where it belongs — the rail — without sliding sideways: the
     scale is small and anchored, so it reads as growth, not travel. The wave is
     tight (22ms a step) under long 0.34s fades, so the cards overlap into one
     bloom rather than popping in one by one. Outgoing grid: a plain fade. */
  const railBloomV = {
    enter: { opacity:1, scale: reduce ? 1 : 0.97, filter:'blur(0px)' },
    center: { opacity:1, scale:1, filter:'blur(0px)', transition:{
      scale: reduce ? { duration:0 } : { type:'spring', stiffness:220, damping:30 } } },
    exit: { opacity:0, filter:'blur(0px)', transition:{ duration:0.12, ease:EASE_OUT } },
  };
  const railBloomCardV = {
    enter: { opacity:0, scale: reduce ? 1 : 0.985 },
    center: ({ delay }) => ({ opacity:1, scale:1, transition:{
      opacity:{ duration:0.34, ease:EASE_OUT, delay }, scale:{ duration:0.4, ease:EASE_OUT, delay } } }),
  };
  // Distance from the anchor in grid steps: columns out from the rail edge,
  // rows out from the row nearest the clicked folder's height.
  const bloomDelay = (i) => {
    if (reduce) return 0;
    const row = Math.floor(i / COLS), col = i % COLS;
    const anchorRow = Math.max(0, Math.min(1, Math.floor((active * RAIL_ROW_H + RAIL_ROW_H / 2 - GRID_TOP) / ROW_PITCH)));
    return Math.min(0.2, (col + Math.abs(row - anchorRow)) * 0.022);
  };
  const bloomOrigin = `0px ${active * RAIL_ROW_H + RAIL_ROW_H / 2 - GRID_TOP}px`;

  /* ---- LAB · four more in V1's family: real vertical travel on springs ---- */

  /* Deal and Folder Flight — per-card variants, built per card because the
     exit target depends on the card's own slot. They are plain objects on
     purpose: on exit Motion resolves variants with AnimatePresence's `custom`
     (the dir number), not the card's own, so an exit that read a per-card
     custom would get a number and break. A plain object never reads custom. */
  const stackV = ({ i, n, tx, ty, s0, rot, inDelay, outDelay, outDur }) => ({
    enter:  reduce ? { opacity:0 } : { x:tx, y:ty, scale:s0, rotate:rot, opacity:0 },
    center: reduce ? { opacity:1, transition:{ duration:0.2 } } : { x:0, y:0, scale:1, rotate:0, opacity:1, transition:{
      default:{ type:'spring', stiffness:250, damping:27, delay: inDelay },
      opacity:{ duration:0.12, ease:EASE_OUT, delay: inDelay } } },
    exit:   reduce ? { opacity:0, transition:{ duration:0.14 } } : { x:tx, y:ty, scale:s0, rotate:rot, opacity:0, transition:{
      default:{ duration: outDur, ease:[0.77, 0, 0.175, 1], delay: outDelay },
      opacity:{ duration:0.1, ease:EASE_OUT, delay: outDelay + outDur - 0.1 } } },
  });
  // A little tilt per card so a gathered pile reads as a real stack — the same
  // language as the folder previews in the rail.
  const tilt = (i) => [-6, 4, -3, 7, -5, 3, -2][i % 7];

  /* Deal — the old cards gather into one tilted stack in the first slot, then
     the new collection is dealt out of it card by card. Stays inside the grid.
     (23 Sep: an "Apple pass" — springs, a neater pile, a lift shadow, earlier
     dealing — was reverted: the new cards crossed the old ones still flying in
     and the shadow bled over neighbouring cards. This is the approved Deal.) */
  const dealV = (i, n) => {
    const [cx, cy] = cardCentre(i), [px, py] = cardCentre(0);
    return stackV({ i, n, tx: px - cx, ty: py - cy, s0: 0.92, rot: i === 0 ? 0 : tilt(i),
      inDelay: 0.1 + i * 0.026, outDelay: (n - 1 - i) * 0.012, outDur: 0.2 });
  };

  /* Folder Flight — the old cards fly back into THEIR folder in the rail and
     tuck under its thumbnail; the new ones fly out of the folder you picked,
     nearest first. The stage stops clipping for this style (see
     data-flight), so the cards can actually reach the rail. They pass under the
     rail's fans and white row (those sit higher in z), which reads as tucking
     into / emerging from the folder. */
  const FAN_CX = 20 + 34;   // rail padding + half the 68px stack
  const flightV = (i, n, folder) => {
    const [cx, cy] = cardCentre(i);
    const fx = FAN_CX - GRID_LEFT, fy = folder * RAIL_ROW_H + RAIL_ROW_H / 2 - GRID_TOP;
    const dist = Math.hypot(fx - cx, fy - cy);
    const rank = dist / 1000;   // ~0.3–1.2 across the grid: nearest cards go first
    // Overlapped: the incoming stream leaves the new folder 60ms after the
    // click while the outgoing stream is still flying home — an exchange
    // rather than two queued animations, which roughly halves the total.
    return stackV({ i, n, tx: fx - cx, ty: fy - cy, s0: 0.17, rot: tilt(i),
      inDelay: 0.06 + rank * 0.12, outDelay: rank * 0.06, outDur: 0.3 });
  };
  const holdV = { enter:{ opacity:1 }, center:{ opacity:1 }, exit:{ opacity:1 } };

  /* Ribbon — Deal's cousin. Instead of every card coming off one pile, each
     card slides out from under its neighbour: the top row ribbons out to the
     right from the first slot, the second row slides down from under the row
     above. The old cards fold back the same way, last card first. */
  const ribbonFrom = (i) => (i === 0 ? 0 : i < COLS ? i - 1 : i - COLS);
  const ribbonDelay = (i) => (i < COLS ? i * 0.05 : ribbonDelay(i - COLS) + 0.09);
  const ribbonV = (i, n) => {
    const [cx, cy] = cardCentre(i), [px, py] = cardCentre(ribbonFrom(i));
    const last = ribbonDelay(n - 1);
    return stackV({ i, n, tx: px - cx, ty: py - cy, s0: i === 0 ? 0.94 : 1, rot: 0,
      inDelay: 0.08 + ribbonDelay(i), outDelay: (last - ribbonDelay(i)) * 0.35, outDur: 0.18 });
  };

  /* Flip — nothing travels. Every card turns over where it lies and the new
     product is on the other side, in a diagonal wave from the top-left. The
     old face turns to edge-on (accelerating, like a real flip's first half)
     and the new face lands from edge-on on a spring, so together they read as
     one continuous turn. rotateY, not rotateX: an exiting card can't know the
     new direction (see stackV), and a sideways turn doesn't need one. */
  const FLIP_P = 1400;
  const flipV = (i) => {
    const d = reduce ? 0 : ((i % COLS) + Math.floor(i / COLS)) * 0.045;
    return reduce ? {
      enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2 } }, exit:{ opacity:0, transition:{ duration:0.14 } },
    } : {
      enter:  { rotateY:-90, opacity:0, transformPerspective:FLIP_P },
      center: { rotateY:0, opacity:1, transformPerspective:FLIP_P, transition:{
        rotateY:{ type:'spring', stiffness:300, damping:30, delay: d + 0.15 },
        opacity:{ duration:0.05, delay: d + 0.15 } } },
      exit:   { rotateY:90, opacity:0, transformPerspective:FLIP_P, transition:{
        rotateY:{ duration:0.15, ease:[0.32, 0, 0.67, 0], delay: d },
        opacity:{ duration:0.04, delay: d + 0.12 } } },
    };
  };

  /* Toss — the new cards are tossed onto the table: each drops from a little
     above (bigger, slightly tilted) and lands with a small settle, one after
     another. The old cards are picked up — they lift and fade together. */
  const tossV = (i, n) => reduce ? {
    enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2 } }, exit:{ opacity:0, transition:{ duration:0.14 } },
  } : {
    enter:  { y:-28, scale:1.07, rotate: tilt(i) * 0.6, opacity:0 },
    center: { y:0, scale:1, rotate:0, opacity:1, transition:{
      default:{ type:'spring', stiffness:380, damping:24, delay: 0.06 + i * 0.045 },
      opacity:{ duration:0.1, ease:EASE_OUT, delay: 0.06 + i * 0.045 } } },
    exit:   { y:-10, scale:1.03, opacity:0, transition:{ duration:0.16, ease:EASE_OUT, delay: (n - 1 - i) * 0.012 } },
  };

  /* Push — V1's direction plus V2's depth  /* Push — V1's direction plus V2's depth, overlapped. The new grid rises 80px
     from below on a spring while the old one drifts up 32px, shrinks to 0.95
     and fades behind it — a new layer pushed up over the last. */
  const pushV = {
    enter: (d)=>({ y: reduce?0:(d>0?80:-80), opacity:0, scale:1, filter: reduce?'blur(0px)':'blur(3px)' }),
    center:{ y:0, opacity:1, scale:1, filter:'blur(0px)', transition:{
      y:{ type:'spring', stiffness:280, damping:32, ...(launchRef.current ? { velocity: launchRef.current.v * 80 / 44 } : null) },
      opacity:{ duration:0.24, ease:EASE_OUT }, filter:{ duration:0.24, ease:EASE_OUT } } },
    exit:(d)=>({ y: reduce?0:(d>0?-32:32), scale: reduce?1:0.95, opacity:0, filter: reduce?'blur(0px)':'blur(3px)',
      transition:{ y:{ duration:0.32, ease:EASE_OUT }, scale:{ duration:0.32, ease:EASE_OUT }, opacity:{ duration:0.26, ease:EASE_OUT }, filter:{ duration:0.26 } } }),
  };

  /* ---- V4 SIGNATURE START ---- */
  /* Converge — iOS's home-screen return / Mission Control exit, on a grid.
     The new collection arrives from just in front of the glass: every card
     starts pushed out radially from the middle of the panel and a touch large,
     then converges onto its slot on one critically damped spring, inner cards
     a beat before outer ones. Positions spread further than the cards grow
     (SIG_SY 13% vs SIG_SIZE 5%) — that mismatch is the parallax: gutters close
     as the cards land, so it reads as things arriving, not a zoom. Horizontal
     spread is smaller only because the side runway is 20px (see the CSS).
     Two more layers ride along: the photo settles inside its well a beat
     behind the card (--sig-zoom), and a soft shadow under the card fades as it
     touches down (--sig-lift). The old collection recedes the other way —
     draws in toward the same point, shrinks and fades fast — so both layers
     move along one depth axis, the new one landing on top.
     Direction-free on purpose: exit is per-card and must be a plain object
     (see stackV), and a slot's radial vector never depends on `dir`.
     No blur on the receding grid: tried it, and a filter over the 7-card grid
     stalled the compositor for ~100ms in the screencast. */
  const SIG_SX = 1.045, SIG_SY = 1.13, SIG_SIZE = 1.05, SIG_ZOOM = 1.1, SIG_IN = 0.92, SIG_OUT_SIZE = 0.93;
  const SIG_SPRING = { type:'spring', visualDuration:0.46, bounce:0 };
  const signatureV = (i) => {
    const [cx, cy] = cardCentre(i);
    const vx = cx - 440, vy = cy - stageMid;          // from the panel's middle
    const ring = Math.min(1, Math.hypot(vx, vy) / 520); // 0 centre … 1 corner
    if (reduce) return {
      enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2, ease:EASE_OUT } }, exit:{ opacity:0, transition:{ duration:0.14 } },
    };
    const d = 0.025 + ring * 0.05;
    return {
      enter:  { x: vx * (SIG_SX - 1), y: vy * (SIG_SY - 1), scale: SIG_SIZE, opacity:0, '--sig-lift':1, '--sig-zoom':SIG_ZOOM },
      center: { x:0, y:0, scale:1, opacity:1, '--sig-lift':0, '--sig-zoom':1, transition:{
        default:{ ...SIG_SPRING, delay:d },
        '--sig-zoom':{ type:'spring', visualDuration:0.56, bounce:0, delay:d },
        opacity:{ duration:0.18, ease:EASE_OUT, delay:d },
        '--sig-lift':{ duration:0.4, ease:[0.55, 0, 0.8, 0.4], delay:d } } },
      exit:   { x: vx * (SIG_IN - 1), y: vy * (SIG_IN - 1), scale: SIG_OUT_SIZE, opacity:0, '--sig-lift':0, transition:{
        default:{ duration:0.3, ease:EASE_OUT }, opacity:{ duration:0.14, ease:EASE_OUT } } },
    };
  };
  /* ---- V4 SIGNATURE END ---- */

  /* V3 · Parallax — V1's unfurl with depth. The whole incoming section rises
     72px AND scales up from 0.93 to full size on critically damped springs
     (the scale a touch slower than the travel, so it keeps growing into place
     after it has arrived — the iOS "comes up to meet you" feel), while its
     rows still unfurl on V1's card stagger. The outgoing section recedes: half
     the travel (36px), down to 0.94, faded in 200ms — the background layer
     moving slower than the foreground is the parallax. Overlapped
     (popLayout), scaled about the panel's middle like V2. */
  const PARALLAX_IN = 72, PARALLAX_OUT = 36;
  const parallaxV = {
    enter: (d)=>({ y: reduce?0:(d>0?PARALLAX_IN:-PARALLAX_IN), scale: reduce?1:0.93, opacity:0 }),
    center:{ y:0, scale:1, opacity:1, transition:{
      y:{ type:'spring', visualDuration:0.5, bounce:0,
          ...(launchRef.current ? { velocity: launchRef.current.v * PARALLAX_IN / 44 } : null) },
      scale:{ type:'spring', visualDuration:0.62, bounce:0 },
      opacity:{ duration:0.28, ease:EASE_OUT, delay:0.04 } } },
    exit:(d)=>({ y: reduce?0:(d>0?-PARALLAX_OUT:PARALLAX_OUT), scale: reduce?1:0.94, opacity:0, transition:{
      y:{ duration:0.34, ease:EASE_OUT }, scale:{ duration:0.34, ease:EASE_OUT }, opacity:{ duration:0.2, ease:EASE_OUT } } }),
  };

  /* ---- V4–V6: three directions from the 24 Sep benchmark ----
     Shared: the whole grid (not each card) owns the exit, as a function of
     `d`, so exits always get the new direction; cards own only their entrance,
     built from the current render's `dir`. Card stagger scales with the count
     so 7 cards and 2 cards finish together: min(40ms, 180ms/(n-1)). */
  const cardStep = (n) => (n > 1 ? Math.min(0.04, 0.18 / (n - 1)) : 0);
  const SETTLE = { type:'spring', visualDuration:0.45, bounce:0 };
  const still = { opacity:0, transition:{ duration:0.2 } };

  /* V4 · Layered Fade-Through — Material's fade-through with Family's
     direction and GOAT's in-card parallax. The old grid leaves quietly as one
     piece (Krehel: exits quieter than entrances): fades and eases to 0.985
     in 180ms, without moving. The new cards arrive in reading order
     along the rail's direction, rising 28px; inside each, the photo drifts
     18px and settles from 1.04 a beat behind its frame, the text follows 40ms
     later, the buttons 80ms later — one card arriving in three layers. */
  const layeredGridV = {
    enter:{ opacity:1 }, center:{ opacity:1 },
    // Plain object on purpose: a function-of-d exit under popLayout never
    // completed when switches overlapped (rapid clicks left three grids
    // mounted). No lift either — the quieter exit is the point.
    exit:{ opacity:0, scale: reduce ? 1 : 0.985, transition:{ duration:0.18, ease:EASE_OUT } },
  };
  const layeredCardV = (i, n) => {
    const rank = dir > 0 ? i : n - 1 - i, delay = 0.05 + rank * cardStep(n);
    if (reduce) return { enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2, delay } } };
    return {
      enter:{ y: 28 * dir, opacity:0 },
      center:{ y:0, opacity:1, transition:{ y:{ ...SETTLE, delay }, opacity:{ duration:0.2, ease:EASE_OUT, delay } } },
      // An explicit no-op exit: without one, a card interrupted mid-entrance
      // (rapid switching) never reported its exit done and its grid stayed
      // mounted. The grid's own exit does the fading.
      exit:{ transition:{ duration:0 } },
    };
  };
  const layeredParts = (i, n) => {
    if (reduce) return null;
    const rank = dir > 0 ? i : n - 1 - i, delay = 0.05 + rank * cardStep(n);
    return {
      photo:{ enter:{ y: 18 * dir, scale:1.04 },
              center:{ y:0, scale:1, transition:{ type:'spring', visualDuration:0.55, bounce:0, delay } }, exit:{ transition:{ duration:0 } } },
      info: { enter:{ y: 8 * dir, opacity:0 },
              center:{ y:0, opacity:1, transition:{ y:{ ...SETTLE, delay: delay + 0.04 }, opacity:{ duration:0.2, ease:EASE_OUT, delay: delay + 0.04 } } }, exit:{ transition:{ duration:0 } } },
      cta:  { enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.22, ease:EASE_OUT, delay: delay + 0.08 } }, exit:{ transition:{ duration:0 } } },
    };
  };

  /* V5 · Proximity Wave — a distance-based stagger (GSAP/Motion "from" grid
     stagger) whose origin is the tab you clicked: each card waits in
     proportion to its distance from that tab's centre (up to 220ms across the
     grid), so the collection arrives as a wave spreading out from the rail.
     Cards rise 16px and grow from 0.95 in place — nothing travels toward the
     rail. The old grid fades out all together in 120ms. */
  const waveGridV = {
    enter:{ opacity:1 }, center:{ opacity:1 },
    exit:{ opacity:0, transition:{ duration:0.12, ease:EASE_OUT } },
  };
  const waveCardV = (i) => {
    // Measured from the nearest card, so the first card moves at once (the
    // grid starts ~250px from the rail — raw distance left a blank beat).
    const [ax, ay] = folderAnchor(active);
    const dist = (k) => { const [cx, cy] = cardCentre(k); return Math.hypot(cx - ax, cy - ay); };
    const n = COLLECTIONS[active].items.length;
    const dmin = Math.min(...Array.from({ length: n }, (_, k) => dist(k)));
    const delay = 0.04 + Math.min(0.22, (dist(i) - dmin) / 1000 * 0.3);
    if (reduce) return { enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2, delay } } };
    return {
      enter:{ y: 16 * dir, scale:0.95, opacity:0 },
      center:{ y:0, scale:1, opacity:1, transition:{
        default:{ type:'spring', visualDuration:0.5, bounce:0.1, delay },
        opacity:{ duration:0.25, ease:EASE_OUT, delay } } },
    };
  };

  /* V6 · Breathing Tray — Family's trays: the panel itself changes height to
     fit the collection (it IS the tray), so 7 cards → 1 visibly exhales and
     1 → 7 inhales, on one spring with a faint settle (bounce 0.12). The old
     cards step out in reverse reading order (20ms apart: fade + 0.97); the new
     ones step in, in order, from 60ms. Exit is per card but plain — it
     depends only on the card's own index. */
  const trayGridV = { enter:{ opacity:1 }, center:{ opacity:1 }, exit:{ opacity:1, transition:{ duration:0.26 } } };
  const trayCardV = (i, n) => {
    const delay = 0.06 + i * cardStep(n);
    if (reduce) return { enter:{ opacity:0 }, center:{ opacity:1, transition:{ duration:0.2, delay } }, exit:{ opacity:0, transition:{ duration:0.14 } } };
    return {
      enter:{ opacity:0, scale:0.97, y: 8 * dir },
      center:{ opacity:1, scale:1, y:0, transition:{ default:{ ...SETTLE, delay }, opacity:{ duration:0.22, ease:EASE_OUT, delay } } },
      exit:{ opacity:0, scale:0.97, transition:{ duration:0.14, ease:EASE_OUT, delay: (n - 1 - i) * 0.02 } },
    };
  };

  /* V6 · Depth — Apple-style spatial crossfade between sibling views (the way
     visionOS and iOS move between peers): the page you leave recedes into
     the screen — eases to 0.97, softly blurs and fades — while the new one
     arrives from just in front of the glass, settling from 1.035 to exact
     size as it rises 36px along the rail's direction and sharpens from a
     blur. Its rows land 35ms apart. One critically damped spring (no bounce)
     carries the scroll's speed. The exit is a plain object (direction-free):
     a function-of-d exit never completes under popLayout on rapid switches. */
  const DEPTH_SPRING = { type:'spring', visualDuration:0.55, bounce:0 };
  const depthV2 = {
    enter:(d)=>({ opacity:0, y: reduce ? 0 : 36 * d, scale: reduce ? 1 : 1.035, filter: reduce ? 'blur(0px)' : 'blur(8px)' }),
    center:{ opacity:1, y:0, scale:1, filter:'blur(0px)', transition:{
      y:{ ...DEPTH_SPRING, ...(launchRef.current ? { velocity: launchRef.current.v * 36 / 44 } : null) },
      scale:DEPTH_SPRING,
      opacity:{ duration:0.3, ease:EASE_OUT, delay:0.05 },
      filter:{ duration:0.42, ease:EASE_OUT, delay:0.02 } } },
    exit:{ opacity:0, scale: reduce ? 1 : 0.97, filter: reduce ? 'blur(0px)' : 'blur(6px)',
      transition:{ duration:0.3, ease:EASE_OUT } },
  };
  const depthRowV = (i, n) => {
    const rows = Math.ceil(n / COLS), row = Math.floor(i / COLS);
    const delay = reduce ? 0 : (dir > 0 ? row : rows - 1 - row) * 0.035;
    return reduce ? { enter:{}, center:{} } : {
      enter:{ y: 10 * dir },
      center:{ y:0, transition:{ y:{ ...DEPTH_SPRING, delay } } },
      exit:{ transition:{ duration:0 } },
    };
  };

  const ROW_STAGGER = style === 'slideDepth' ? 0.045 : 0.055;
  const rowDelay = (i, n) => {
    if (reduce) return 0;
    const rows = Math.ceil(n / COLS), row = Math.floor(i / COLS);
    return (dir > 0 ? row : rows - 1 - row) * ROW_STAGGER;
  };

  const isSharedGrid = style === 'morph' || style === 'bloom' || style === 'glide' || style === 'wordmorph';
  /* Per-style grid + card choreography for the staggered family. */
  const STAGGERED = {
    slide:      { grid: slideV,      card: cardV,       delay: (i, n) => rowDelay(i, n) },
    depth2:     { grid: depthV2,     cardFor: (i, n) => depthRowV(i, n),       delay: () => 0 },
    parallax:   { grid: parallaxV,   card: cardV,       delay: (i, n) => rowDelay(i, n) },
    slideDepth: { grid: depthSectionV, card: null,      delay: () => 0 },
    focus:      { grid: focusV,        card: null,           delay: () => 0 },
    railBloom:  { grid: railBloomV,    card: railBloomCardV, delay: (i) => bloomDelay(i) },
    push:       { grid: pushV,         card: cardV,          delay: (i, n) => rowDelay(i, n) },
    deal:       { grid: holdV,         cardFor: (i, n) => dealV(i, n),           delay: () => 0 },
    layered:    { grid: layeredGridV,  cardFor: (i, n) => layeredCardV(i, n), partsFor: (i, n) => layeredParts(i, n), delay: () => 0 },
    wave:       { grid: waveGridV,     cardFor: (i) => waveCardV(i),             delay: () => 0 },
    tray:       { grid: trayGridV,     cardFor: (i, n) => trayCardV(i, n),       delay: () => 0 },
    ribbon:     { grid: holdV,         cardFor: (i, n) => ribbonV(i, n),         delay: () => 0 },
    flip:       { grid: holdV,         cardFor: (i) => flipV(i),                 delay: () => 0 },
    toss:       { grid: holdV,         cardFor: (i, n) => tossV(i, n),           delay: () => 0 },
    signature:  { grid: holdV,         cardFor: (i) => signatureV(i),            delay: () => 0 },  // V4 · Converge
    flight:     { grid: holdV,         cardFor: (i, n) => flightV(i, n, active), delay: () => 0 },
  };
  const per = STAGGERED[style];
  const unfurl = !!per;
  /* V3/V4 overlap the outgoing and incoming grids instead of running them in
     sequence. Under mode="wait" the filmstrip showed ~120ms of completely empty
     stage between them. Neither version travels, so an overlap reads as a
     cross-dissolve rather than two grids colliding — and in V3 the new cards
     wipe in over the old ones, which is what a wipe should be. V1/V2 keep
     "wait": their travel needs the old grid gone first. */
  // V2 overlaps too now: the incoming section rising while the outgoing one
  // sinks is the whole effect, and a blank frame between them would break it.
  const gridMode = (style === 'focus' || style === 'railBloom' || style === 'slideDepth' || style === 'push' || style === 'glide' || style === 'flight' || style === 'parallax' || style === 'signature' || style === 'depth2' || style === 'layered' || style === 'wave' || style === 'tray' || OPEN_STAGE.has(style)) ? 'popLayout' : mode;
  /* Transform-origin for V2: the vertical middle of the stage, measured, so
     every collection recedes toward the same point in the panel. */
  const [stageMid, setStageMid] = useState(494);
  React.useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const m = () => setStageMid(Math.round((el.clientHeight || 988) / 2));
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, []);

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
    // V4 · Liquid Tab draws the white tab itself from these two ends, on the
    // same springs that drive its page.
    const a = animate(edgeA, active, style === 'liquid' ? LIQ_LEAD : NOTCH_LEAD);
    const b = animate(edgeB, active, style === 'liquid' ? LIQ_TRAIL : NOTCH_TRAIL);
    return () => { a.stop(); b.stop(); };
  }, [active]);
  /* V4 · Liquid Tab: the scroll pull (in rows) rides on the lead end, so the
     tab starts stretching toward the next row while you're still scrolling. */
  const leadEdge = useTransform([edgeA, liquidPull], ([a, p]) => a + p);
  /* The blue marker always runs on its own two springs (NOTCH_LEAD/TRAIL), in
     every version. In Liquid it used to ride the white shape's 0.62/0.9s
     glide, whose soft start made it lag and crawl compared with the rest. */
  const markA = useMotionValue(0), markB = useMotionValue(0);
  React.useEffect(() => {
    if (reduce) { markA.set(active); markB.set(active); return; }
    const a = animate(markA, active, NOTCH_LEAD);
    const b = animate(markB, active, NOTCH_TRAIL);
    return () => { a.stop(); b.stop(); };
  }, [active]);
  const notchY = useTransform([markA, markB], ([a, b]) => `translateY(${(Math.min(a, b) * RAIL_ROW_H + NOTCH_TOP).toFixed(2)}px)`);
  const notchH = useTransform([markA, markB], ([a, b]) => Math.abs(a - b) * RAIL_ROW_H + NOTCH_H);

  return (
    <motion.div className="mp-frame" ref={frameRef}
      /* V6 · Breathing Tray: the panel is the tray — its height follows the
         collection (header + rows + padding), on one spring. */
      initial={false}
      animate={style === 'tray' ? { height: Math.max(RAIL_MIN_H, GRID_TOP + sectionH(col.items.length) + 20) } : undefined}
      transition={{ height: reduce ? { duration:0 } : { type:'spring', visualDuration:0.5, bounce:0.12 } }}>
      {/* rail */}
      <LayoutGroup>
      <nav className="mp-rail" role="tablist">
        {/* Selection is one moving object: the white row, its blue notch and the
            two inverted corners that tie it into the content area. It travels on
            the grid's spring so the rail and the cards read as one gesture.
            Full transform string — the x/y shorthands aren't accelerated. */}
        {style === 'liquid' && <LiquidTab a={leadEdge} b={edgeB} />}
        <motion.span className="mp-sel" aria-hidden style={{ transform: railTransform, display: style === 'liquid' ? 'none' : undefined }}>
          <img className="mp-sel-corner mp-sel-corner-top" src={IMG('37a34.svg')} alt="" />
          <img className="mp-sel-corner mp-sel-corner-bot" src={IMG('37a34.svg')} alt="" />
        </motion.span>
        <motion.span className="mp-notch" aria-hidden style={{ transform: notchY, height: notchH }} />
        {COLLECTIONS.map((c,i)=>{
          const on = i===active;
          return (
            <button key={c.id} className="mp-row" role="tab" aria-selected={on} tabIndex={on?0:-1} onClick={()=>select(i)}>
              <FolderPreview items={c.items} selected={on} quiet={() => !!launchRef.current} />
              <span className="mp-meta">
                <span className="mp-rowName">{c.name}</span>
                <span className="mp-rowCount">{c.count} Items</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* content */}
      <div className="mp-content" data-doc={(style === 'liquid' || style === 'chain' || style === 'origami') ? '' : undefined}>
        <div className="mp-header">
          <div className="mp-title-wrap">
            {/* Always popLayout: the blur morph needs the old and new names
                overlapping in one spot, in every version — under "wait" V1
                showed an empty heading between them. */}
            {style === 'wordmorph' ? <TitleMorph name={col.name} reduce={reduce} /> : (
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              {style === 'deal' ? (
                /* V2 · Deal has no blur anywhere, so its heading doesn't
                   blur-morph: the new name is dealt in letter by letter, left to
                   right in the same order the cards are dealt, each letter
                   settling down from 5px above — no tilt, no bounce — while
                   the old name simply fades. Letters are aria-hidden; the h1 carries the name. */
                <motion.h1 key={col.id} className="mp-title" aria-label={col.name}
                  variants={dealTitleV} initial="enter" animate="center" exit="exit" onUpdate={JS_DRIVEN}>
                  {[...col.name].map((ch, i) => (
                    <motion.span key={i} className="mp-title-ch" aria-hidden="true" variants={dealCharV(i)} onUpdate={JS_DRIVEN}>
                      {ch === ' ' ? '\u00a0' : ch}
                    </motion.span>
                  ))}
                </motion.h1>
              ) : (
                <motion.h1 key={col.id} className="mp-title" custom={dir}
                  variants={titleV} initial="enter" animate="center" exit="exit" onUpdate={JS_DRIVEN}>{col.name}</motion.h1>
              )}
            </AnimatePresence>
            )}
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
        <div className="mp-stage-wrap" ref={wrapRef} data-moving={moving ? '' : undefined} data-open={(style === 'flight' || OPEN_STAGE.has(style)) ? '' : undefined}
          data-sig={style === 'signature' ? '' : undefined}
          data-track={(style === 'carousel' || style === 'stack' || style === 'liquid' || style === 'chain') ? '' : undefined}
          data-stack={style === 'stack' ? '' : undefined}>
        <motion.div className="mp-stage" layoutScroll ref={stageRef}>
        <div key={`${style}-${mode}`} className="mp-presence">
        {style === 'depth2' ? (
          <DepthTrack active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'silhouette' ? (
          <SilhouetteMorph active={active} reduce={reduce} onSettle={() => setMoving(false)} />
        ) : style === 'gooey' ? (
          reduce ? <GooeyFade active={active} /> : <GooeyMerge active={active} dir={dir} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'origami' ? (
          <OrigamiTrack active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'liquid' ? (
          <LiquidTrack active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'chain' ? (
          <ChainTrack active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'carousel' ? (
          <CarouselTrack active={active} reduce={reduce} onSettle={() => setMoving(false)} />
        ) : style === 'stack' ? (
          <StackDeck active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : isSharedGrid ? (
          <div className="mp-grid">
            <AnimatePresence mode={(style === 'glide' || style === 'wordmorph') ? 'popLayout' : mode} custom={dir} initial={false}>
              {style === 'wordmorph' ? morphIds(col.items).map((id, i) => {
                /* V7 · Word Morph — same photo, same element: it glides to its
                   new slot; everything else dissolves out / resolves in. */
                const key = col.items[i];
                return (
                  <motion.div key={id} className="mp-cell" layout onUpdate={JS_DRIVEN}
                    initial={{ opacity:0, scale: reduce ? 1 : 0.94, filter: reduce ? 'blur(0px)' : 'blur(6px)' }}
                    animate={{ opacity:1, scale:1, filter:'blur(0px)' }}
                    exit={{ opacity:0, scale: reduce ? 1 : 0.94, filter: reduce ? 'blur(0px)' : 'blur(6px)', transition:{ duration:0.2, ease:EASE_OUT } }}
                    transition={{ layout: reduce ? { duration:0 } : MORPH_SPRING, scale:{ ...MORPH_SPRING, delay:0.06 },
                      opacity:{ duration:0.24, ease:EASE_OUT, delay:0.06 }, filter:{ duration:0.32, ease:EASE_OUT, delay:0.06 } }}>
                    <CardInner p={PRODUCTS[key]} />
                  </motion.div>
                );
              }) : col.items.map((key,i)=>{
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
                /* Lab · Glide — a product that is in both collections glides
                   from its old slot to its new one (shared layoutId, V1's
                   spring); everything else unfurls in V1-style, staggered by
                   row. Matched cards never fade: they are the same object. */
                if (style==='glide') {
                  const first = col.items.indexOf(key)===i;
                  const matched = first && fromMap.has(key);
                  const rows = Math.ceil(col.items.length / COLS), row = Math.floor(i / COLS);
                  const delay = reduce ? 0 : (dir > 0 ? row : rows - 1 - row) * 0.055;
                  return (
                    <motion.div key={`${col.id}-${i}`} className="mp-cell"
                      layoutId={first ? `g-${key}` : undefined} layout={first ? true : false}
                      initial={ matched ? false : { opacity:0, y: reduce ? 0 : (dir > 0 ? 64 : -64) } }
                      animate={{ opacity:1, y:0, transition:{ y:{ ...SPRING, delay }, opacity:{ duration:0.22, ease:EASE_OUT, delay }, layout: SPRING } }}
                      exit={{ opacity:0, scale: reduce ? 1 : 0.96, transition:{ duration:0.16, ease:EASE_OUT } }}
                      transition={{ layout: SPRING }}>
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
              <motion.div key={col.id} className="mp-grid" custom={dir} onUpdate={JS_DRIVEN}
                variants={per ? per.grid : style==='depth' ? depthV : dissolveV}
                initial="enter" animate="center" exit="exit"
                style={(style === 'slideDepth' || style === 'push' || style === 'parallax' || style === 'depth2') ? { transformOrigin: `50% ${stageMid}px` }
                     : style === 'railBloom' ? { transformOrigin: bloomOrigin } : undefined}
                onAnimationComplete={(d)=>{ if (d === 'center') setMoving(false); }}>
                {col.items.map((key,i)=> (unfurl && per.cardFor) ? (
                  <motion.div key={i} className="mp-cell" variants={per.cardFor(i, col.items.length)} onUpdate={JS_DRIVEN}
                    style={{ position:'relative', zIndex: col.items.length - i }}>
                    <CardInner p={PRODUCTS[key]} parts={per.partsFor ? per.partsFor(i, col.items.length) : undefined} />
                  </motion.div>
                ) : (unfurl && per.card) ? (
                  <motion.div key={i} className="mp-cell" variants={per.card} onUpdate={JS_DRIVEN}
                    custom={{ d: dir, delay: per.delay(i, col.items.length) }}>
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
    </motion.div>
  );
}
