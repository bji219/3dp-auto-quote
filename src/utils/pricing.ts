import { STLData, PricingConfig } from '@/types';

/**
 * Default pricing configuration
 */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  basePricePerCm3: parseFloat(process.env.BASE_PRICE_PER_CM3 || '0.15'),
  materialCostMultiplier: parseFloat(process.env.MATERIAL_COST_MULTIPLIER || '1.2'),
  rushOrderMultiplier: parseFloat(process.env.RUSH_ORDER_MULTIPLIER || '1.5'),
  qualityMultipliers: {
    draft: 0.8,
    standard: 1.0,
    high: 1.4,
  },
  laborCostPerHour: 25,
  estimatedPrintSpeedCm3PerHour: 10,
};

export interface CalculateQuoteParams {
  stlData: STLData;
  material?: string;
  infillPercentage?: number;
  quality?: 'draft' | 'standard' | 'high';
  rushOrder?: boolean;
  config?: Partial<PricingConfig>;
}

export interface QuoteCalculation {
  baseCost: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  estimatedPrintTime: number; // in hours
  details: {
    volume: number;
    surfaceArea: number;
    material: string;
    infillPercentage: number;
    quality: string;
    rushOrder: boolean;
  };
}

/**
 * Calculate quote based on STL data and parameters
 */
export function calculateQuote(params: CalculateQuoteParams): QuoteCalculation {
  const {
    stlData,
    material = 'PLA',
    infillPercentage = 20,
    quality = 'standard',
    rushOrder = false,
    config = {},
  } = params;

  const pricingConfig: PricingConfig = {
    ...DEFAULT_PRICING_CONFIG,
    ...config,
  };

  // Base cost calculation based on volume
  const volumeCost = stlData.volume * pricingConfig.basePricePerCm3;

  // Material cost adjustment
  const materialMultiplier = getMaterialMultiplier(material);
  const materialCost = volumeCost * materialMultiplier * pricingConfig.materialCostMultiplier;

  // Infill adjustment (higher infill = more material)
  const infillMultiplier = 1 + (infillPercentage / 100) * 0.5;

  // Quality multiplier
  const qualityMultiplier = pricingConfig.qualityMultipliers[quality] || 1.0;

  // Estimate print time based on volume and quality
  const basePrintTime = stlData.volume / pricingConfig.estimatedPrintSpeedCm3PerHour;
  const estimatedPrintTime = basePrintTime * qualityMultiplier * infillMultiplier;

  // Labor cost
  const laborCost = estimatedPrintTime * pricingConfig.laborCostPerHour;

  // Calculate subtotal
  let baseCost = volumeCost * infillMultiplier;
  let totalMaterialCost = materialCost * infillMultiplier * qualityMultiplier;

  // Rush order multiplier
  if (rushOrder) {
    baseCost *= pricingConfig.rushOrderMultiplier;
    totalMaterialCost *= pricingConfig.rushOrderMultiplier;
  }

  // Total cost
  const totalCost = baseCost + totalMaterialCost + laborCost;

  return {
    baseCost: parseFloat(baseCost.toFixed(2)),
    materialCost: parseFloat(totalMaterialCost.toFixed(2)),
    laborCost: parseFloat(laborCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    estimatedPrintTime: parseFloat(estimatedPrintTime.toFixed(2)),
    details: {
      volume: stlData.volume,
      surfaceArea: stlData.surfaceArea,
      material,
      infillPercentage,
      quality,
      rushOrder,
    },
  };
}

/**
 * Get material cost multiplier based on material type
 */
function getMaterialMultiplier(material: string): number {
  const materialMultipliers: Record<string, number> = {
    PLA: 1.0,
    ABS: 1.2,
    PETG: 1.3,
    TPU: 1.8,
    Nylon: 2.0,
    'Carbon Fiber': 3.5,
    Resin: 2.5,
  };

  return materialMultipliers[material] || 1.0;
}

/**
 * Calculate volume discount based on order size
 */
export function calculateVolumeDiscount(volume: number): number {
  if (volume > 1000) return 0.2; // 20% discount for very large orders
  if (volume > 500) return 0.15; // 15% discount
  if (volume > 200) return 0.1; // 10% discount
  if (volume > 100) return 0.05; // 5% discount
  return 0; // No discount
}

/**
 * Apply volume discount to quote
 */
export function applyVolumeDiscount(quote: QuoteCalculation): QuoteCalculation {
  const discount = calculateVolumeDiscount(quote.details.volume);

  if (discount === 0) return quote;

  const discountAmount = quote.totalCost * discount;

  return {
    ...quote,
    totalCost: parseFloat((quote.totalCost - discountAmount).toFixed(2)),
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Calculate quote validity period (default 7 days)
 */
export function getQuoteValidityDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
