import { STLData } from '@/types';
import {
  MATERIALS,
  MaterialId,
  PUBLIC_PRICING,
  QuoteWarning,
  analysisFromSummary,
  buildQuote,
} from '@/lib/quote-engine';

/**
 * Server-side adapter: prices an STLData record with the quote engine and
 * returns the breakdown shape the API routes, emails and database expect.
 * All rates live in src/lib/quote-engine/config.ts.
 */

export interface CostBreakdown {
  /** Setup fee plus any top-up to the minimum order. */
  setupFee: number;
  materialCost: number;
  /** Handling for all parts. */
  laborCost: number;
  machineCost: number;
  /** Support removal for all parts. */
  complexitySurcharge: number;
  shippingCost: number;
  /** Before discount, rush and tax. */
  subtotal: number;
  discount: number;
  rushOrderFee: number;
  taxAmount: number;
  total: number;
}

export interface DetailedQuote {
  breakdown: CostBreakdown;
  quantity: number;
  unitPrice: number;
  orderable: boolean;
  warnings: QuoteWarning[];
  model: {
    volume: number; // cm³
    surfaceArea: number; // cm²
    boundingBox: { x: number; y: number; z: number }; // cm
    /** Printed weight of one part, grams. */
    weight: number;
    complexity: number;
    isComplex: boolean;
  };
  material: {
    name: string;
    costPerCm3: number;
    density: number;
    totalMaterialVolume: number; // cm³ extruded, one part
    totalMaterialWeight: number; // grams, whole order
  };
  print: {
    /** Hours for the whole order. */
    estimatedTime: number;
    hoursPerPart: number;
    quality: string;
    infillPercentage: number;
    rushOrder: boolean;
    layerHeight: number;
    orientation: string;
    needsSupport: boolean;
  };
  shipping?: {
    weight: number;
    dimensions: { length: number; width: number; height: number };
    cost: number;
    isFree: boolean;
  };
  discount?: { type: string; amount: number; percentage: number };
  validUntil: Date;
  createdAt: Date;
}

export interface DetailedQuoteOptions {
  material?: string;
  infillPercentage?: number;
  quality?: 'draft' | 'standard' | 'high';
  rushOrder?: boolean;
  shippingEnabled?: boolean;
  quantity?: number;
  unitScale?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calculateDetailedQuote(
  stlData: STLData,
  options: DetailedQuoteOptions = {}
): DetailedQuote {
  const material = (
    options.material && options.material in MATERIALS ? options.material : 'PLA'
  ) as MaterialId;
  const analysis =
    stlData.analysis ??
    analysisFromSummary(stlData.volume * 1000, stlData.surfaceArea * 100, [
      stlData.boundingBox.x * 10,
      stlData.boundingBox.y * 10,
      stlData.boundingBox.z * 10,
    ]);

  const q = buildQuote(analysis, {
    material,
    quality: options.quality ?? 'standard',
    infill: options.infillPercentage ?? 15,
    quantity: options.quantity ?? 1,
    rush: options.rushOrder ?? false,
    shipping: options.shippingEnabled ?? true,
    unitScale: options.unitScale ?? 1,
  });
  const { price: p, estimate: e, analysis: a } = q;
  const mat = MATERIALS[material];
  const n = p.quantity;

  const breakdown: CostBreakdown = {
    setupFee: r2(p.setupFee + p.minimumAdjustment),
    materialCost: r2(p.unit.material * n),
    laborCost: r2(p.unit.handling * n),
    machineCost: r2(p.unit.machine * n),
    complexitySurcharge: r2(p.unit.supportRemoval * n),
    shippingCost: p.shipping,
    subtotal: 0,
    discount: p.discount,
    rushOrderFee: p.rushFee,
    taxAmount: p.tax,
    total: p.total,
  };
  // Keep the lines summing exactly to the total despite per-line rounding.
  breakdown.subtotal = r2(p.total - p.tax - p.rushFee + p.discount);
  breakdown.laborCost = r2(
    breakdown.subtotal -
      breakdown.setupFee -
      breakdown.materialCost -
      breakdown.machineCost -
      breakdown.complexitySurcharge -
      breakdown.shippingCost
  );

  const complexity = a.volume > 0 ? a.area / 100 / (a.volume / 1000) : 0;
  const quote: DetailedQuote = {
    breakdown,
    quantity: n,
    unitPrice: p.unitPrice,
    orderable: q.orderable,
    warnings: q.warnings,
    model: {
      volume: r2(a.volume / 1000),
      surfaceArea: r2(a.area / 100),
      boundingBox: { x: r2(a.size[0] / 10), y: r2(a.size[1] / 10), z: r2(a.size[2] / 10) },
      weight: r2(e.grams),
      complexity: r2(complexity),
      isComplex: e.needsSupport,
    },
    material: {
      name: mat.name,
      costPerCm3: r2(mat.sellPerGram * mat.density),
      density: mat.density,
      totalMaterialVolume: r2(e.volume.total / 1000),
      totalMaterialWeight: r2(p.totalGrams),
    },
    print: {
      estimatedTime: r2(p.totalHours),
      hoursPerPart: r2(e.hours),
      quality: options.quality ?? 'standard',
      infillPercentage: options.infillPercentage ?? 15,
      rushOrder: options.rushOrder ?? false,
      layerHeight: e.layerHeight,
      orientation: e.orientation.label,
      needsSupport: e.needsSupport,
    },
    validUntil: getQuoteValidityDate(PUBLIC_PRICING.quoteValidDays),
    createdAt: new Date(),
  };

  if (options.shippingEnabled ?? true) {
    quote.shipping = {
      weight: r2(p.totalGrams),
      dimensions: {
        length: r2(a.size[0] / 10),
        width: r2(a.size[1] / 10),
        height: r2(a.size[2] / 10),
      },
      cost: p.shipping,
      isFree: p.freeShipping,
    };
  }
  if (p.discount > 0) {
    quote.discount = {
      type: `Quantity discount (${p.discountPercent}%)`,
      amount: p.discount,
      percentage: p.discountPercent,
    };
  }
  return quote;
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export function getQuoteValidityDate(days: number = PUBLIC_PRICING.quoteValidDays): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Everything worth keeping about a quote that the Quote table has no column
 * for. Stored as extra keys in the `boundingBox` JSON string, alongside x/y/z,
 * so no migration is needed and older readers are unaffected.
 */
export interface QuoteMeta {
  x: number;
  y: number;
  z: number;
  quantity: number;
  unitPrice: number;
  gramsPerPart: number;
  hoursPerPart: number;
  orientation: string;
  needsSupport: boolean;
  breakdown: CostBreakdown;
}

export function encodeQuoteMeta(q: DetailedQuote): string {
  const meta: QuoteMeta = {
    ...q.model.boundingBox,
    quantity: q.quantity,
    unitPrice: q.unitPrice,
    gramsPerPart: q.model.weight,
    hoursPerPart: q.print.hoursPerPart,
    orientation: q.print.orientation,
    needsSupport: q.print.needsSupport,
    breakdown: q.breakdown,
  };
  return JSON.stringify(meta);
}

export function decodeQuoteMeta(boundingBox: string | null | undefined): Partial<QuoteMeta> {
  if (!boundingBox) return {};
  try {
    const v = JSON.parse(boundingBox);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/** Human-readable one-liner for order emails: size, quantity, and print plan. */
export function describeQuoteMeta(boundingBox: string | null | undefined): string {
  const m = decodeQuoteMeta(boundingBox);
  if (m.x === undefined) return boundingBox || 'n/a';
  const mm = (cm: number) => (cm * 10).toFixed(1);
  const parts = [`${mm(m.x)} × ${mm(m.y ?? 0)} × ${mm(m.z ?? 0)} mm`];
  if (m.quantity) parts.push(`QTY ${m.quantity}`);
  if (m.gramsPerPart) parts.push(`${m.gramsPerPart.toFixed(1)} g/part`);
  if (m.hoursPerPart) parts.push(`${m.hoursPerPart.toFixed(2)} h/part`);
  if (m.orientation) parts.push(`print ${m.orientation}`);
  if (m.needsSupport) parts.push('needs supports');
  return parts.join(' · ');
}
