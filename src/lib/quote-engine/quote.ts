import { ACTIVE_PRINTER, MATERIALS, MaterialId, PrinterProfile, Quality } from './config';
import { estimatePrint, PrintEstimate } from './estimate';
import { analyzeMesh, MeshAnalysis, parseStl, scaleAnalysis } from './mesh';
import { pricePublic, PublicQuote } from './price';

export interface QuoteOptions {
  material: MaterialId;
  quality: Quality;
  infill: number;
  quantity: number;
  rush: boolean;
  /** Multiply the file's coordinates by this to get millimetres. */
  unitScale?: number;
  shipping?: boolean;
  printer?: PrinterProfile;
}

export type WarningLevel = 'info' | 'warn' | 'block';
export interface QuoteWarning {
  level: WarningLevel;
  code: 'units' | 'open' | 'too-big' | 'tiny' | 'thin' | 'supports' | 'material' | 'heavy-mesh';
  message: string;
}

export interface FullQuote {
  analysis: MeshAnalysis;
  estimate: PrintEstimate;
  price: PublicQuote;
  warnings: QuoteWarning[];
  /** False when a human needs to look before a price can be trusted. */
  orderable: boolean;
}

export const DEFAULT_OPTIONS: QuoteOptions = {
  material: 'PLA',
  quality: 'standard',
  infill: 15,
  quantity: 1,
  rush: false,
  unitScale: 1,
};

/** Guess the file's units when the numbers are implausible as millimetres. */
export function suggestUnitScale(a: MeshAnalysis): { scale: number; unit: string } | null {
  const max = Math.max(...a.size);
  if (max < 0.5) return { scale: 1000, unit: 'metres' };
  if (max < 10) return { scale: 25.4, unit: 'inches' };
  return null;
}

/** Turn an analysed mesh and a set of options into a priced quote with warnings. */
export function buildQuote(raw: MeshAnalysis, options: Partial<QuoteOptions> = {}): FullQuote {
  const o = { ...DEFAULT_OPTIONS, ...options };
  const printer = o.printer ?? ACTIVE_PRINTER;
  const analysis = scaleAnalysis(raw, o.unitScale ?? 1);
  const estimate = estimatePrint(analysis, {
    material: o.material,
    quality: o.quality,
    infill: o.infill,
    orientation: 'auto',
    printer,
  });
  const price = pricePublic(estimate, {
    material: o.material,
    quantity: o.quantity,
    rush: o.rush,
    shipping: o.shipping,
    printer,
  });

  const warnings: QuoteWarning[] = [];
  const [sx, sy, sz] = analysis.size;
  const max = Math.max(sx, sy, sz);
  const min = Math.min(sx, sy, sz);
  const dims = `${sx.toFixed(1)} × ${sy.toFixed(1)} × ${sz.toFixed(1)} mm`;

  const guess = (o.unitScale ?? 1) === 1 ? suggestUnitScale(raw) : null;
  if (guess) {
    warnings.push({
      level: 'warn',
      code: 'units',
      message: `This model measures ${dims}. If it was drawn in ${guess.unit}, switch the units above.`,
    });
  }
  if (!estimate.fitsPrinter) {
    warnings.push({
      level: 'block',
      code: 'too-big',
      message: `At ${dims} this is larger than our ${printer.build.x} × ${printer.build.y} × ${printer.build.z} mm build volume. Email us and we will quote it split into sections.`,
    });
  }
  if (max < 2) {
    warnings.push({
      level: 'block',
      code: 'tiny',
      message: `At ${dims} this is too small to print reliably. Check the units.`,
    });
  } else if (min < 0.8) {
    warnings.push({
      level: 'warn',
      code: 'thin',
      message: `The thinnest dimension is ${min.toFixed(2)} mm, which is under two nozzle widths. We will confirm it is printable before starting.`,
    });
  }
  if (analysis.openness > 0.02 || analysis.volume <= 0) {
    warnings.push({
      level: 'warn',
      code: 'open',
      message:
        'The mesh is not watertight (it has holes or missing faces), so volume and price are approximate. We will repair it and confirm the price before printing.',
    });
  }
  if (estimate.needsSupport) {
    warnings.push({
      level: 'info',
      code: 'supports',
      message: `Overhangs need about ${estimate.supportGrams.toFixed(1)} g of support material, included in the price. Supported faces have a rougher finish.`,
    });
  }
  if (!MATERIALS[o.material]?.available) {
    warnings.push({
      level: 'block',
      code: 'material',
      message: `${MATERIALS[o.material]?.name ?? o.material} is by request only. Email us for availability.`,
    });
  }

  return {
    analysis,
    estimate,
    price,
    warnings,
    orderable: !warnings.some((w) => w.level === 'block') && analysis.volume > 0,
  };
}

/** One call from file bytes to quote. Throws StlError for unreadable files. */
export function quoteFromStl(buf: ArrayBuffer, options: Partial<QuoteOptions> = {}): FullQuote {
  const printer = options.printer ?? ACTIVE_PRINTER;
  return buildQuote(analyzeMesh(parseStl(buf), printer.overhangAngle), options);
}

export function formatHours(hours: number): string {
  const mins = Math.max(1, Math.round(hours * 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatMoney(n: number): string {
  return '$' + n.toFixed(2);
}
