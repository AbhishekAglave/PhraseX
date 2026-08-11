'use client';

import { useEffect, useRef } from 'react';

/**
 * Pastel aurora layer behind the whole page.
 *
 * At rest nothing moves and the palette sits at its calm resting
 * colours. While `busy` is true (an /api/analyze or /api/tone request is
 * in flight) a requestAnimationFrame loop pushes every blob along a
 * *randomly chosen heading*, floods the layer with saturation, sweeps
 * the hue around and spins a sheen across the whole screen.
 *
 * Three separate levels control that:
 *
 * - `motionLevel` drives movement. It snaps to 1 on start and brakes to
 *   0 within ~2 frames of the response, so blobs stop on the spot.
 * - `colorLevel` drives hue/saturation/brightness. Same instant bloom,
 *   but eases back to the resting palette over ~1.5s.
 * - `holdLevel` drives blob size and the upper blobs' opacity, and only
 *   ever rises. Nothing is wound back, so the background never zooms or
 *   snaps its shape when a run ends, and the colour stays spread over
 *   the whole page instead of collapsing to the bottom band.
 *
 * Each run also rolls a random motion pattern — see `AuroraMode` — so it
 * may travel straight across the screen along an axis or a diagonal,
 * fast or slow, or hold still and just shift colour. Nothing curves or
 * orbits. Nothing is ever reset between runs either: a new run always
 * continues from the exact state the last one froze at.
 */

type Blob = {
  className: string;
  restOpacity: number;
  liftOpacity: number;
  /** vw per second at full intensity */
  baseSpeed: number;
  /** how strongly the blob breathes */
  breathe: number;
};

const BLOBS: Blob[] = [
  { className: 'aurora__blob--mint', restOpacity: 0.7, liftOpacity: 0.3, baseSpeed: 48, breathe: 0.22 },
  { className: 'aurora__blob--sky', restOpacity: 0.7, liftOpacity: 0.3, baseSpeed: 54, breathe: 0.2 },
  { className: 'aurora__blob--azure', restOpacity: 0.7, liftOpacity: 0.3, baseSpeed: 60, breathe: 0.26 },
  { className: 'aurora__blob--peach', restOpacity: 1, liftOpacity: 0, baseSpeed: 56, breathe: 0.2 },
  { className: 'aurora__blob--rose', restOpacity: 1, liftOpacity: 0, baseSpeed: 64, breathe: 0.24 },
  { className: 'aurora__blob--lavender', restOpacity: 1, liftOpacity: 0, baseSpeed: 52, breathe: 0.18 }
];

type BlobMotion = {
  x: number;
  y: number;
  heading: number;
  turn: number;
  speed: number;
  phase: number;
  phaseSpeed: number;
};

/**
 * The box blobs may roam in, in vw/vh.
 *
 * Shared by every mode on purpose: a per-mode box would yank a blob back
 * the moment a narrower run started, undoing the freeze-in-place
 * behaviour. Kept deliberately tight — the travelling modes move every
 * blob in the *same* direction, so a generous box would let the entire
 * palette slide off one edge and leave the page bare grey.
 */
const BOUND_X = 30;
const BOUND_Y = 20;
/** How far the hue may swing away from the resting palette, in degrees. */
const HUE_BOUND = 95;

const TAU = Math.PI * 2;

function createMotion(): BlobMotion {
  return {
    x: 0,
    y: 0,
    heading: Math.random() * TAU,
    turn: 0,
    speed: 5,
    phase: Math.random() * TAU,
    phaseSpeed: 5
  };
}

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

/**
 * The motion pattern for one run. No mode curves or orbits — every one is
 * a straight line along a single shared heading, or no travel at all.
 *
 * - `linear`  — the default: straight along one axis, bottom to top, left
 *               to right, or the reverse of either.
 * - `sweep`   — the same straight travel, but on a diagonal.
 * - `glide`   — a slow straight slide with the colour pulsing on top.
 * - `shimmer` — no travel; the hue and the pulse do all the work.
 */
type AuroraMode = 'linear' | 'sweep' | 'glide' | 'shimmer';

/** Everything except `shimmer` travels, and travels parallel. */
const DIRECTIONAL_MODES: readonly AuroraMode[] = ['linear', 'sweep', 'glide'];

/** Weighted so straight axis runs dominate and standing still is rarest. */
const MODE_WEIGHTS: Array<[AuroraMode, number]> = [
  ['linear', 0.4],
  ['sweep', 0.26],
  ['glide', 0.2],
  ['shimmer', 0.14]
];

/** Straight up, down, left or right. */
function cardinalHeading() {
  return Math.floor(Math.random() * 4) * (TAU / 4);
}

/** One of the four diagonals. */
function diagonalHeading() {
  return Math.floor(Math.random() * 4) * (TAU / 4) + TAU / 8;
}


function pickMode(): AuroraMode {
  let roll = Math.random();

  for (const [mode, weight] of MODE_WEIGHTS) {
    roll -= weight;

    if (roll <= 0) {
      return mode;
    }
  }

  return 'linear';
}

export function AuroraBackground({ busy }: { busy: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLSpanElement>(null);
  const blobRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const motions = useRef<BlobMotion[]>(BLOBS.map(createMotion));
  const hue = useRef(0);
  const hueDir = useRef(1);
  const hueSpeed = useRef(14);
  const veil = useRef({ angle: 0, dir: 1, speed: 16 });
  /** Amplifies the size pulse when a run barely travels. */
  const breatheBoost = useRef(1);
  const modeRef = useRef<AuroraMode>('linear');
  /** Shared heading for travelling runs, so the blobs stay parallel. */
  const sweepHeading = useRef(0);

  /** Drives movement. Snaps to 1 on start, brakes to 0 on response. */
  const motionLevel = useRef(0);
  /** Drives the colour surge. Same fast rise, gentle fall back to rest. */
  const colorLevel = useRef(0);
  /** Only ever rises: keeps the blobs' size and spread frozen after a run. */
  const holdLevel = useRef(0);
  const busyRef = useRef(busy);
  const frame = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  useEffect(() => {
    busyRef.current = busy;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      return;
    }

    // Every run rolls a fresh motion pattern and fresh randomness inside
    // it, so no two runs look alike. Nothing is reset here — x, y, hue and
    // the sheen angle all carry over, so a run always starts from the
    // exact state the previous one froze at.
    if (busy) {
      const mode = pickMode();

      modeRef.current = mode;
      sweepHeading.current = mode === 'sweep' ? diagonalHeading() : cardinalHeading();

      for (const motion of motions.current) {
        // `turn` stays 0 for every travelling mode: any turn rate bends the
        // path into an arc, which is what made the old modes look like they
        // were spinning.
        switch (mode) {
          // Straight along a diagonal.
          case 'sweep':
            motion.heading = sweepHeading.current + (Math.random() - 0.5) * 0.06;
            motion.turn = 0;
            motion.speed = 0.36 + Math.random() * 0.18;
            motion.phaseSpeed = 2.6 + Math.random() * 1.8;
            break;

          // The same straight travel, but slow, with the colour pulsing.
          case 'glide':
            motion.heading = sweepHeading.current + (Math.random() - 0.5) * 0.06;
            motion.turn = 0;
            motion.speed = 0.17 + Math.random() * 0.13;
            motion.phaseSpeed = 4.4 + Math.random() * 2.6;
            break;

          // No travel — the colour does the work, pulsing in place.
          case 'shimmer':
            motion.turn = 0;
            motion.speed = 0;
            motion.phaseSpeed = 5 + Math.random() * 3;
            break;

          // `linear`: dead straight along one axis — bottom to top, left to
          // right, or the reverse.
          default:
            motion.heading = sweepHeading.current + (Math.random() - 0.5) * 0.06;
            motion.turn = 0;
            // Paced so the first straight pass lasts a second or two —
            // long enough that a typical request reads as one direction
            // rather than a bounce off the edge of the roaming box.
            motion.speed = 0.32 + Math.random() * 0.18;
            motion.phaseSpeed = 3 + Math.random() * 2;
        }
      }

      // Barely travelling means the hue and the pulse carry the effect.
      const slowMoving = mode === 'shimmer' || mode === 'glide';

      breatheBoost.current = slowMoving ? 1.8 : 1;
      hueDir.current = Math.random() < 0.5 ? -1 : 1;
      hueSpeed.current = slowMoving ? 270 + Math.random() * 190 : 170 + Math.random() * 140;
      veil.current.dir = Math.random() < 0.5 ? -1 : 1;
      // The sheen is a conic gradient, so rotating it reads as the whole
      // background spinning. Shimmer holds it still and only pulses its
      // opacity; the travelling modes creep it just enough to shift the
      // highlight.
      veil.current.speed = mode === 'shimmer' ? 0 : 16 + Math.random() * 20;

      console.log('[aurora]', mode);
    }

    if (!busy && motionLevel.current === 0 && colorLevel.current === 0) {
      return;
    }

    function step(now: number) {
      const previous = lastTime.current ?? now;
      const delta = Math.min((now - previous) / 1000, 0.05);
      lastTime.current = now;

      const target = busyRef.current ? 1 : 0;

      // Movement: snaps on, then brakes hard the moment the response
      // lands so the blobs stop on the spot they had reached.
      motionLevel.current +=
        (target - motionLevel.current) *
        Math.min(delta * (target > motionLevel.current ? 22 : 34), 1);

      if (target === 0 && motionLevel.current < 0.004) {
        motionLevel.current = 0;
      }

      // Colour: same instant bloom, but eases back to the resting
      // palette over ~1.5s instead of snapping.
      colorLevel.current +=
        (target - colorLevel.current) *
        Math.min(delta * (target > colorLevel.current ? 22 : 1.7), 1);

      if (target === 0 && colorLevel.current < 0.004) {
        colorLevel.current = 0;
      }

      // Size and spread only ever grow, and are never wound back — that
      // is what stops the background snapping/zooming back to its
      // starting shape once a run ends.
      if (motionLevel.current > holdLevel.current) {
        holdLevel.current = motionLevel.current;
      }

      const level = motionLevel.current;
      const color = colorLevel.current;
      const hold = holdLevel.current;

      // A directional run has to stay parallel, so a blob hitting a wall
      // reflects the whole group's shared heading rather than only itself.
      const sweeping = DIRECTIONAL_MODES.includes(modeRef.current);
      let sweepHitX = false;
      let sweepHitY = false;

      BLOBS.forEach((blob, index) => {
        const motion = motions.current[index];
        const element = blobRefs.current[index];

        if (level > 0) {
          motion.heading += motion.turn * delta;
          motion.phase += motion.phaseSpeed * delta;

          const travel = blob.baseSpeed * motion.speed * level * delta;
          motion.x += Math.cos(motion.heading) * travel;
          motion.y += Math.sin(motion.heading) * travel;

          // Bounce off the edges of the roaming area.
          if (motion.x > BOUND_X || motion.x < -BOUND_X) {
            motion.x = clamp(motion.x, BOUND_X);

            if (sweeping) {
              sweepHitX = true;
            } else {
              motion.heading = Math.PI - motion.heading;
            }
          }

          if (motion.y > BOUND_Y || motion.y < -BOUND_Y) {
            motion.y = clamp(motion.y, BOUND_Y);

            if (sweeping) {
              sweepHitY = true;
            } else {
              motion.heading = -motion.heading;
            }
          }
        }

        if (!element) {
          return;
        }

        // `hold` never falls, so the blob keeps the size it had reached
        // and the upper blobs keep their lifted opacity — colour stays
        // spread over the whole page instead of collapsing to the bottom.
        // Never below 1: the blobs are sized to overflow the viewport, so
        // shrinking one could expose bare canvas at a page edge.
        const pulse = blob.breathe * breatheBoost.current * Math.sin(motion.phase);
        const scale = Math.max(1, 1 + hold * (0.28 + pulse));
        element.style.transform = `translate3d(${motion.x.toFixed(2)}vw, ${motion.y.toFixed(
          2
        )}vh, 0) scale(${scale.toFixed(3)})`;
        element.style.opacity = (blob.restOpacity + blob.liftOpacity * hold).toFixed(3);
      });

      if (sweeping && (sweepHitX || sweepHitY)) {
        if (sweepHitX) {
          sweepHeading.current = Math.PI - sweepHeading.current;
        }

        if (sweepHitY) {
          sweepHeading.current = -sweepHeading.current;
        }

        for (const motion of motions.current) {
          motion.heading = sweepHeading.current + (Math.random() - 0.5) * 0.1;
        }
      }

      if (level > 0) {
        hue.current += hueDir.current * hueSpeed.current * level * delta;

        if (hue.current > HUE_BOUND || hue.current < -HUE_BOUND) {
          hueDir.current *= -1;
          hue.current = clamp(hue.current, HUE_BOUND);
        }

        veil.current.angle += veil.current.dir * veil.current.speed * level * delta;
      }

      // The colour boost rides `color`, so the palette blooms on start and
      // eases back to the resting colours after the response — while the
      // blobs themselves stay frozen where they stopped.
      const layer = layerRef.current;
      if (layer) {
        layer.style.setProperty('--aurora-hue', `${(hue.current * color).toFixed(2)}deg`);
        layer.style.setProperty('--aurora-saturate', (1 + color * 1.7).toFixed(3));
        layer.style.setProperty('--aurora-brightness', (1 + color * 0.08).toFixed(3));
        layer.style.setProperty('--aurora-contrast', (1 + color * 0.12).toFixed(3));
      }

      const sheen = veilRef.current;
      if (sheen) {
        sheen.style.transform = `rotate(${veil.current.angle.toFixed(2)}deg) scale(${(
          1 + hold * 0.18
        ).toFixed(3)})`;
        sheen.style.opacity = color.toFixed(3);
      }

      if (busyRef.current || motionLevel.current > 0 || colorLevel.current > 0) {
        frame.current = window.requestAnimationFrame(step);
        return;
      }

      // Fully at rest: drop the loop and leave everything exactly where
      // it stopped.
      frame.current = null;
      lastTime.current = null;
    }

    if (frame.current === null) {
      lastTime.current = null;
      frame.current = window.requestAnimationFrame(step);
    }

    return () => {
      // Keep the loop alive across `busy` flips; only tear it down when
      // the component unmounts.
    };
  }, [busy]);

  useEffect(() => {
    return () => {
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, []);

  return (
    <div className="aurora" ref={layerRef} data-busy={busy} aria-hidden="true">
      {BLOBS.map((blob, index) => (
        <span
          key={blob.className}
          ref={(node) => {
            blobRefs.current[index] = node;
          }}
          className={`aurora__blob ${blob.className}`}
        />
      ))}
      <span className="aurora__veil" ref={veilRef} />
    </div>
  );
}
