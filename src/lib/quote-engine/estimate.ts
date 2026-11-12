import {
  ACTIVE_PRINTER,
  LAYER_HEIGHT,
  MATERIALS,
  MaterialId,
  PrinterProfile,
  Quality,
} from './config';
import { MeshAnalysis, Orientation } from './mesh';

export interface PrintSettings {
  material: MaterialId;
  quality: Quality;
  /** 0-100 */
  infill: number;
  /** Index into analysis.orientations, or 'auto' to pick the cheapest that fits. */
  orientation?: number | 'auto';
  printer?: PrinterProfile;
}

export interface PrintEstimate {
  orientationIndex: number;
  orientation: Orientation;
  layerHeight: number;
  layers: number;
  /** Extruded plastic by feature, mm³. */
  volume: { walls: number; skin: number; infill: number; support: number; total: number };
  /** Per part, excluding the once-per-plate purge. */
  grams: number;
  supportGrams: number;
  /** Per part, excluding the once-per-plate startup. */
  hours: number;
  needsSupport: boolean;
  fitsPrinter: boolean;
}

/** A fully solid print extrudes a little less than the geometric volume. */
const SOLID_FRACTION = 0.97;

/** Fitted against PrusaSlicer 2.7 across 14 shapes x 4 settings. See README. */
export const TUNE = { wallSegments: 8, fillChord: 1 };

/** Does a box of this footprint and height fit, allowing a 90° turn on the plate? */
function fits(o: Orientation, p: PrinterProfile): boolean {
  const [a, b] = o.footprint;
  const flat = (a <= p.build.x && b <= p.build.y) || (a <= p.build.y && b <= p.build.x);
  return flat && o.height <= p.build.z;
}

/**
 * Average speed over a move of length `len` that starts and ends at rest:
 * a trapezoid if there is room to reach `v`, a triangle if not.
 */
function effectiveSpeed(v: number, len: number, accel: number): number {
  if (len <= 0) return v;
  const ramp = (v * v) / accel; // distance to accelerate and brake
  if (len >= ramp) return len / (len / v + v / accel);
  return Math.sqrt(len * accel) / 2;
}

function estimateFor(
  a: MeshAnalysis,
  index: number,
  s: PrintSettings,
  p: PrinterProfile
): PrintEstimate {
  const o = a.orientations[index];
  const mat = MATERIALS[s.material] ?? MATERIALS.PLA;
  const h = LAYER_HEIGHT[s.quality] ?? LAYER_HEIGHT.standard;
  const infill = Math.min(100, Math.max(0, s.infill)) / 100;
  const layers = Math.max(1, Math.ceil(o.height / h));

  // Shell: walls follow the side surface, skins cover the plan-view surface.
  const skinThickness = (minLayers: number, minThickness: number) =>
    Math.max(minLayers, Math.ceil(minThickness / h - 1e-6)) * h;
  const wallRaw = o.lateralArea * p.walls * p.lineWidth;
  const skinRaw =
    o.topArea * skinThickness(p.topLayers, p.topThickness) +
    o.bottomArea * skinThickness(p.bottomLayers, p.bottomThickness);
  const shellRaw = wallRaw + skinRaw;
  // Thin sections go fully solid before the shells nominally meet (the slicer
  // gap-fills what is left), and a "solid" print is ~93% of geometric volume.
  const x = shellRaw / a.volume;
  const shell = a.volume * Math.min(SOLID_FRACTION, x * (1 + 0.35 * x * x));
  const walls = shellRaw > 0 ? shell * (wallRaw / shellRaw) : 0;
  const skin = shell - walls;
  const fill = Math.max(0, a.volume * SOLID_FRACTION - shell) * infill;

  // Supports: a sparse column to the bed plus a dense interface under the
  // overhang. Trivial overhangs (chamfers, small lips) print without.
  const significant = o.overhangArea > Math.max(20, 0.02 * (o.topArea + o.bottomArea));
  const support = significant
    ? o.supportColumn * p.supportDensity + o.overhangArea * p.supportInterface
    : 0;

  const total = walls + skin + fill + support;
  const grams = (total / 1000) * mat.density;
  const supportGrams = (support / 1000) * mat.density;

  // Time = extruded volume / volumetric flow, per feature. Characteristic move
  // lengths decide how much of the target speed acceleration lets us reach.
  const crossSection = a.volume / Math.max(o.height, h); // mean area of a layer
  const loop = o.lateralArea / Math.max(o.height, h); // mean perimeter of a layer
  const wallMove = Math.max(1, loop / TUNE.wallSegments);
  const fillMove = Math.max(1, Math.sqrt(crossSection) * TUNE.fillChord);
  const flow = (speed: number, move: number) =>
    Math.min(mat.maxFlow, p.lineWidth * h * effectiveSpeed(speed, move, p.acceleration));

  // The first layer goes down slowly for adhesion.
  const first = Math.min(total, (total / layers) * 1);
  const firstShare = total > 0 ? first / total : 0;
  const rest = 1 - firstShare;
  const printing =
    rest *
      (walls / flow(p.speed.wall, wallMove) +
        skin / flow(p.speed.solid, fillMove) +
        fill / flow(p.speed.infill, fillMove) +
        support / flow(p.speed.support, fillMove)) +
    first / flow(p.speed.firstLayer, fillMove);
  const seconds = printing * (1 + p.travelOverhead) + layers * p.secondsPerLayer;

  return {
    orientationIndex: index,
    orientation: o,
    layerHeight: h,
    layers,
    volume: { walls, skin, infill: fill, support, total },
    grams,
    supportGrams,
    hours: (seconds / 3600) * p.timeCalibration,
    needsSupport: support > 0,
    fitsPrinter: fits(o, p),
  };
}

/**
 * Estimate material and time for one part. With orientation 'auto' this tries
 * the six axis-aligned orientations and keeps the one a print operator would
 * pick: fits the machine, least support, then shortest print.
 */
export function estimatePrint(a: MeshAnalysis, s: PrintSettings): PrintEstimate {
  const p = s.printer ?? ACTIVE_PRINTER;
  if (typeof s.orientation === 'number') {
    return estimateFor(a, Math.min(5, Math.max(0, s.orientation)), s, p);
  }
  let best: PrintEstimate | null = null;
  let bestScore = Infinity;
  // Try the uploaded orientation first so it wins ties.
  for (const i of [4, 5, 0, 1, 2, 3]) {
    const e = estimateFor(a, i, s, p);
    // Support costs more than its plastic: removal labour and scarred surfaces.
    // A part with nothing flat on the bed is a risky print.
    const unstable =
      e.orientation.bedContact < 0.02 * (e.orientation.footprint[0] * e.orientation.footprint[1]);
    const score =
      (e.fitsPrinter ? 0 : 1e9) +
      e.hours +
      e.supportGrams * 0.15 +
      (unstable ? e.hours * 0.5 + 0.25 : 0);
    if (score < bestScore - 1e-9) {
      best = e;
      bestScore = score;
    }
  }
  return best as PrintEstimate;
}
