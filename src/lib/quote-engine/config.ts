/**
 * Every tunable number in the quote engine lives in this file.
 *
 * Geometry is always in millimetres, volume in mm³, mass in grams, time in hours.
 * The estimator is physical (extruded volume / volumetric flow), so the knobs
 * here are the same ones you would set in a slicer.
 */

export type MaterialId = 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Nylon' | 'Carbon Fiber' | 'Resin';
export type Quality = 'draft' | 'standard' | 'high';

export interface MaterialSpec {
  id: MaterialId;
  name: string;
  blurb: string;
  /** g/cm³ */
  density: number;
  /** What a spool costs you, $/kg. Used by the internal estimator. */
  costPerKg: number;
  /** What the public tool charges per printed gram. */
  sellPerGram: number;
  /** Hot-end limit for this material, mm³/s. Caps every print speed. */
  maxFlow: number;
  /** Offered in the public tool. Unavailable materials still price internally. */
  available: boolean;
}

export const MATERIALS: Record<MaterialId, MaterialSpec> = {
  PLA: {
    id: 'PLA',
    name: 'PLA',
    blurb: 'Rigid, crisp detail, widest colour range. The default for most parts.',
    density: 1.24,
    costPerKg: 22,
    sellPerGram: 0.1,
    maxFlow: 18,
    available: true,
  },
  PETG: {
    id: 'PETG',
    name: 'PETG',
    blurb: 'Tougher and more heat tolerant than PLA. Good for functional parts.',
    density: 1.27,
    costPerKg: 24,
    sellPerGram: 0.12,
    maxFlow: 11,
    available: false,
  },
  ABS: {
    id: 'ABS',
    name: 'ABS / ASA',
    blurb: 'Heat and UV resistant. For enclosures and outdoor use.',
    density: 1.05,
    costPerKg: 26,
    sellPerGram: 0.13,
    maxFlow: 15,
    available: false,
  },
  TPU: {
    id: 'TPU',
    name: 'TPU (flexible)',
    blurb: 'Rubber-like. Gaskets, feet, bumpers.',
    density: 1.21,
    costPerKg: 38,
    sellPerGram: 0.2,
    maxFlow: 3.5,
    available: false,
  },
  Nylon: {
    id: 'Nylon',
    name: 'Nylon',
    blurb: 'Wear resistant and strong. Gears, hinges, clips.',
    density: 1.14,
    costPerKg: 60,
    sellPerGram: 0.26,
    maxFlow: 8,
    available: false,
  },
  'Carbon Fiber': {
    id: 'Carbon Fiber',
    name: 'Carbon-fibre filled',
    blurb: 'Stiff, matte, dimensionally stable.',
    density: 1.3,
    costPerKg: 55,
    sellPerGram: 0.28,
    maxFlow: 10,
    available: false,
  },
  Resin: {
    id: 'Resin',
    name: 'Resin',
    blurb: 'Not offered yet. Priced with the filament model, so treat as a placeholder.',
    density: 1.15,
    costPerKg: 45,
    sellPerGram: 0.3,
    maxFlow: 8,
    available: false,
  },
};

export const LAYER_HEIGHT: Record<Quality, number> = {
  draft: 0.28,
  standard: 0.2,
  high: 0.12,
};

export interface PrinterProfile {
  name: string;
  /** Usable build volume, mm. */
  build: { x: number; y: number; z: number };
  lineWidth: number;
  walls: number;
  /** Solid skins: at least this many layers and at least this thick (mm). */
  topLayers: number;
  topThickness: number;
  bottomLayers: number;
  bottomThickness: number;
  /** Target speeds, mm/s. Real speed is lower once acceleration is accounted for. */
  speed: { wall: number; solid: number; infill: number; support: number; firstLayer: number };
  /** mm/s² */
  acceleration: number;
  /** Faces steeper than this from vertical get support, degrees. */
  overhangAngle: number;
  /** Fraction of the supported column that is actually plastic. */
  supportDensity: number;
  /** Dense interface under each overhang, as an equivalent solid thickness in mm. */
  supportInterface: number;
  /** Seconds lost per layer to the layer change. */
  secondsPerLayer: number;
  /** Non-printing travel, as a fraction of printing time. */
  travelOverhead: number;
  /** Heat-up, bed levelling, purge. Hours, once per plate. */
  startupHours: number;
  /** Purge line, skirt, etc. Grams, once per plate. */
  startupGrams: number;
  /**
   * Multiply every time estimate by this. Slice one real part, divide the
   * slicer's time by the tool's time, and put the ratio here.
   */
  timeCalibration: number;
}

/**
 * Default: an enclosed, input-shaped CoreXY in the 256 mm class with a 0.4 mm nozzle.
 * If you run something slower (a bed-slinger without input shaping), switch
 * ACTIVE_PRINTER to CLASSIC or halve the speeds.
 */
export const FAST_COREXY: PrinterProfile = {
  name: 'Fast CoreXY, 0.4 mm nozzle',
  build: { x: 256, y: 256, z: 256 },
  lineWidth: 0.45,
  walls: 2,
  topLayers: 5,
  topThickness: 1.0,
  bottomLayers: 3,
  bottomThickness: 0.6,
  speed: { wall: 160, solid: 150, infill: 200, support: 120, firstLayer: 60 },
  acceleration: 6000,
  overhangAngle: 45,
  supportDensity: 0.15,
  supportInterface: 1.0,
  secondsPerLayer: 1,
  travelOverhead: 0.2,
  startupHours: 0.1,
  startupGrams: 1,
  timeCalibration: 1,
};

export const CLASSIC: PrinterProfile = {
  ...FAST_COREXY,
  name: 'Classic bed-slinger, 0.4 mm nozzle',
  build: { x: 220, y: 220, z: 250 },
  speed: { wall: 50, solid: 60, infill: 80, support: 60, firstLayer: 25 },
  acceleration: 1000,
  secondsPerLayer: 2,
};

export const ACTIVE_PRINTER: PrinterProfile = FAST_COREXY;

/** Public (customer-facing) price list. */
export const PUBLIC_PRICING = {
  currency: 'USD',
  /** Per order: file check, slicing, plate prep. */
  setupFee: 5,
  /** Per printed hour. Covers the machine and your margin on its time. */
  machineRatePerHour: 4,
  /** Per part: pull from the plate, inspect, bag. */
  handlingPerPart: 1,
  /** Added to a part's price when it needs support removal. */
  supportRemoval: { percent: 0.1, minimum: 1 },
  /** Setup + parts never totals less than this (before shipping). */
  minimumOrder: 15,
  /** Applied to the parts line, by quantity of the same part. */
  quantityDiscounts: [
    { minQty: 50, percent: 20 },
    { minQty: 25, percent: 15 },
    { minQty: 10, percent: 10 },
    { minQty: 5, percent: 5 },
  ],
  rush: { percent: 0.25, minimum: 15 },
  shipping: { flat: 8.99, freeOver: 100 },
  taxRate: 0,
  quoteValidDays: 7,
  maxQuantity: 200,
};

/** Defaults for the internal job estimator. All editable on the page. */
export const INTERNAL_DEFAULTS = {
  designRatePerHour: 75,
  shopRatePerHour: 30,
  /** True running cost: depreciation, power, nozzles, build plates. */
  machineCostPerHour: 0.8,
  /** Share of prints you expect to scrap and redo. */
  failureRate: 0.07,
  /** Gross margin on cost. Price = cost / (1 - margin). */
  targetMargin: 0.45,
  /** Card processing. */
  paymentFee: { percent: 0.029, fixed: 0.3 },
  setupMinutesPerJob: 15,
  postProcessMinutesPerPart: 3,
  packagingPerOrder: 1.5,
};
