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
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, useTransform, animate, motionValue } from 'framer-motion';

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
const OPEN_STAGE = new Set(['deal', 'ribbon', 'flip', 'toss']);
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
const LIQ_LEAD  = { type:'spring', stiffness:560, damping:46 };   // ζ ≈ 0.97, races ahead
const LIQ_TRAIL = { type:'spring', stiffness:170, damping:23 };   // ζ ≈ 0.88, the give (≈6px settle)
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
  const d = useTransform([a, b], ([x, y]) => liquidPath(x, y));
  const h = COLLECTIONS.length * RAIL_ROW_H + 2 * LIQ_R;
  return (
    <svg className="mp-liquid" aria-hidden="true" width="280" height={h} viewBox={`0 ${-LIQ_R} 280 ${h}`}>
      <motion.path d={d} fill="#fff" />
    </svg>
  );
}
function LiquidSection({ k, c, y, on }) {
  const opacity = useTransform(y, (v) => docOpacity(k, DOC_OFFS[k] + v));
  return (
    <motion.div className="mp-doc-link" aria-hidden={!on}
      style={{ top: DOC_OFFS[k], y, opacity, pointerEvents: on ? 'auto' : 'none' }}>
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
    const v = launch.current?.v;
    // Chapters on the side you're leaving ride the lead; the target and what's
    // beyond it ride the trail. Decided per switch from where they are now,
    // so a reversal mid-flight re-assigns without a jump.
    const anims = ys.map((y, k) => animate(y, T, {
      ...((k - active) * dir < 0 ? LIQ_LEAD : LIQ_TRAIL), ...(v ? { velocity: v } : null) }));
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
      wrap?.style.setProperty('--rubber', v.toFixed(1) + 'px');
      // A pull displaces the content past the stage edge, so it clips there
      // exactly as a transition does — bring the fade in with it, scaled to how
      // far it has stretched. Without this the cards shear off mid-pull.
      wrap?.style.setProperty('--fade-pull', Math.min(12, Math.abs(v)).toFixed(1) + 'px');
    };
    const release = () => {
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
    setMoving(true);
    // Cleared when the grid's own entrance reports done (onAnimationComplete
    // below); this is only the backstop for a style whose entrance never fires
    // one, and it is short so the band can't outlive the movement.
    const t = setTimeout(() => setMoving(false), (style === 'carousel' || style === 'stack' || style === 'liquid' || style === 'chain') ? 950 : 340);
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

  const ROW_STAGGER = style === 'slideDepth' ? 0.045 : 0.055;
  const rowDelay = (i, n) => {
    if (reduce) return 0;
    const rows = Math.ceil(n / COLS), row = Math.floor(i / COLS);
    return (dir > 0 ? row : rows - 1 - row) * ROW_STAGGER;
  };

  const isSharedGrid = style === 'morph' || style === 'bloom' || style === 'glide';
  /* Per-style grid + card choreography for the staggered family. */
  const STAGGERED = {
    slide:      { grid: slideV,      card: cardV,       delay: (i, n) => rowDelay(i, n) },
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
  const gridMode = (style === 'focus' || style === 'railBloom' || style === 'slideDepth' || style === 'push' || style === 'glide' || style === 'flight' || style === 'parallax' || style === 'signature' || style === 'layered' || style === 'wave' || style === 'tray' || OPEN_STAGE.has(style)) ? 'popLayout' : mode;
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
  const notchY = useTransform([edgeA, edgeB], ([a, b]) => `translateY(${(Math.min(a, b) * RAIL_ROW_H + NOTCH_TOP).toFixed(2)}px)`);
  const notchH = useTransform([edgeA, edgeB], ([a, b]) => Math.abs(a - b) * RAIL_ROW_H + NOTCH_H);

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
        {style === 'liquid' && <LiquidTab a={edgeA} b={edgeB} />}
        <motion.span className="mp-sel" aria-hidden style={{ transform: railTransform, display: style === 'liquid' ? 'none' : undefined }}>
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
      <div className="mp-content" data-doc={(style === 'liquid' || style === 'chain') ? '' : undefined}>
        <div className="mp-header">
          <div className="mp-title-wrap">
            {/* Always popLayout: the blur morph needs the old and new names
                overlapping in one spot, in every version — under "wait" V1
                showed an empty heading between them. */}
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
        {style === 'liquid' ? (
          <LiquidTrack active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'chain' ? (
          <ChainTrack active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : style === 'carousel' ? (
          <CarouselTrack active={active} reduce={reduce} onSettle={() => setMoving(false)} />
        ) : style === 'stack' ? (
          <StackDeck active={active} reduce={reduce} launch={launchRef} onSettle={() => setMoving(false)} />
        ) : isSharedGrid ? (
          <div className="mp-grid">
            <AnimatePresence mode={style === 'glide' ? 'popLayout' : mode} custom={dir} initial={false}>
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
                style={(style === 'slideDepth' || style === 'push' || style === 'parallax') ? { transformOrigin: `50% ${stageMid}px` }
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
