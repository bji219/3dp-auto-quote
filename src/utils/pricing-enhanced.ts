import { STLData } from '@/types';

/**
 * Material Properties with detailed specifications
 */
export interface MaterialProperties {
  name: string;
  costPerCm3: number; // Cost per cubic centimeter
  density: number; // g/cm³
  color?: string;
  printSpeed: number; // cm³/hour
  description?: string;
}

/**
 * Comprehensive pricing configuration
 */
export interface EnhancedPricingConfig {
  // Base pricing
  baseSetupFee: number; // One-time setup fee per order
  laborRatePerHour: number; // Hourly labor rate
  machineRatePerHour: number; // Machine operating cost per hour

  // Quality multipliers
  qualityMultipliers: {
    draft: number;
    standard: number;
    high: number;
  };

  // Complexity pricing
  complexityEnabled: boolean;
  complexityThreshold: number; // Surface area to volume ratio threshold
  complexityMultiplier: number; // Additional cost for complex models

  // Shipping
  shippingEnabled: boolean;
  shippingBaseRate: number; // Base shipping cost
  shippingRatePerKg: number; // Cost per kilogram
  shippingRatePerCm: number; // Cost per cm of max dimension
  freeShippingThreshold: number; // Free shipping above this order value

  // Discounts
  volumeDiscounts: Array<{
    minVolume: number;
    discountPercent: number;
  }>;

  // Rush order
  rushOrderMultiplier: number;
  rushOrderFee: number;

  // Tax
  taxRate: number; // Tax rate as decimal (e.g., 0.08 for 8%)
}

/**
 * Itemized cost breakdown
 */
export interface CostBreakdown {
  setupFee: number;
  materialCost: number;
  laborCost: number;
  machineCost: number;
  complexitySurcharge: number;
  shippingCost: number;
  subtotal: number;
  discount: number;
  rushOrderFee: number;
  taxAmount: number;
  total: number;
}

/**
 * Complete quote with all details
 */
export interface DetailedQuote {
  // Costs
  breakdown: CostBreakdown;

  // Model details
  model: {
    volume: number; // cm³
    surfaceArea: number; // cm²
    boundingBox: {
      x: number;
      y: number;
      z: number;
    };
    weight: number; // grams
    complexity: number; // Surface area to volume ratio
    isComplex: boolean;
  };

  // Material details
  material: {
    name: string;
    costPerCm3: number;
    density: number;
    totalMaterialVolume: number; // Including infill
    totalMaterialWeight: number; // grams
  };

  // Print details
  print: {
    estimatedTime: number; // hours
    quality: string;
    infillPercentage: number;
    rushOrder: boolean;
  };

  // Shipping details (if enabled)
  shipping?: {
    weight: number; // grams
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    cost: number;
    isFree: boolean;
  };

  // Discount details
  discount?: {
    type: string;
    amount: number;
    percentage: number;
  };

  // Validity
  validUntil: Date;
  createdAt: Date;
}

/**
 * Material database with detailed properties
 */
export const MATERIAL_DATABASE: Record<string, MaterialProperties> = {
  PLA: {
    name: 'PLA (Polylactic Acid)',
    costPerCm3: 0.04, // $0.04 per cm³
    density: 1.24, // g/cm³
    printSpeed: 12, // cm³/hour
    description: 'Easy to print, biodegradable, great for beginners',
  },
  ABS: {
    name: 'ABS (Acrylonitrile Butadiene Styrene)',
    costPerCm3: 0.05,
    density: 1.04,
    printSpeed: 10,
    description: 'Durable, heat-resistant, good for functional parts',
  },
  PETG: {
    name: 'PETG (Polyethylene Terephthalate Glycol)',
    costPerCm3: 0.06,
    density: 1.27,
    printSpeed: 10,
    description: 'Strong, flexible, chemical resistant',
  },
  TPU: {
    name: 'TPU (Thermoplastic Polyurethane)',
    costPerCm3: 0.12,
    density: 1.21,
    printSpeed: 6,
    description: 'Flexible, elastic, rubber-like properties',
  },
  Nylon: {
    name: 'Nylon (Polyamide)',
    costPerCm3: 0.15,
    density: 1.14,
    printSpeed: 8,
    description: 'Very strong, wear-resistant, ideal for mechanical parts',
  },
  'Carbon Fiber': {
    name: 'Carbon Fiber Reinforced',
    costPerCm3: 0.25,
    density: 1.3,
    printSpeed: 7,
    description: 'Extremely strong, lightweight, premium material',
  },
  Resin: {
    name: 'Resin (Standard)',
    costPerCm3: 0.18,
    density: 1.15,
    printSpeed: 5,
    description: 'High detail, smooth surface, great for miniatures',
  },
};

/**
 * Default enhanced pricing configuration
 */
export const DEFAULT_ENHANCED_CONFIG: EnhancedPricingConfig = {
  baseSetupFee: 5.0,
  laborRatePerHour: 25.0,
  machineRatePerHour: 5.0,

  qualityMultipliers: {
    draft: 0.8,
    standard: 1.0,
    high: 1.4,
  },

  complexityEnabled: true,
  complexityThreshold: 8.0, // SA/V ratio > 8 is considered complex
  complexityMultiplier: 1.25,

  shippingEnabled: true,
  shippingBaseRate: 5.0,
  shippingRatePerKg: 2.5,
  shippingRatePerCm: 0.1,
  freeShippingThreshold: 100.0,

  volumeDiscounts: [
    { minVolume: 1000, discountPercent: 20 },
    { minVolume: 500, discountPercent: 15 },
    { minVolume: 200, discountPercent: 10 },
    { minVolume: 100, discountPercent: 5 },
  ],

  rushOrderMultiplier: 1.0,
  rushOrderFee: 15.0,

  taxRate: 0.0, // No tax by default, can be configured
};

/**
 * Calculate detailed quote with itemized breakdown
 */
export function calculateDetailedQuote(
  stlData: STLData,
  options: {
    material?: string;
    infillPercentage?: number;
    quality?: 'draft' | 'standard' | 'high';
    rushOrder?: boolean;
    shippingEnabled?: boolean;
    config?: Partial<EnhancedPricingConfig>;
  } = {}
): DetailedQuote {
  const {
    material = 'PLA',
    infillPercentage = 20,
    quality = 'standard',
    rushOrder = false,
    shippingEnabled = true,
    config = {},
  } = options;

  // Merge configuration
  const pricingConfig: EnhancedPricingConfig = {
    ...DEFAULT_ENHANCED_CONFIG,
    ...config,
  };

  // Get material properties
  const materialProps = MATERIAL_DATABASE[material] || MATERIAL_DATABASE.PLA;

  // Calculate infill multiplier (affects material volume)
  const infillMultiplier = 1 + (infillPercentage / 100) * 0.5;

  // Calculate total material volume needed
  const totalMaterialVolume = stlData.volume * infillMultiplier;

  // Calculate weight
  const totalMaterialWeight = totalMaterialVolume * materialProps.density;

  // Calculate complexity factor
  const complexity = stlData.surfaceArea / stlData.volume;
  const isComplex = pricingConfig.complexityEnabled && complexity > pricingConfig.complexityThreshold;

  // Calculate print time
  const qualityMultiplier = pricingConfig.qualityMultipliers[quality] || 1.0;
  const estimatedPrintTime =
    (stlData.volume / materialProps.printSpeed) * qualityMultiplier * infillMultiplier;

  // --- COST CALCULATIONS ---

  // 1. Setup fee
  const setupFee = pricingConfig.baseSetupFee;

  // 2. Material cost
  const materialCost = totalMaterialVolume * materialProps.costPerCm3;

  // 3. Labor cost
  const laborCost = estimatedPrintTime * pricingConfig.laborRatePerHour;

  // 4. Machine cost
  const machineCost = estimatedPrintTime * pricingConfig.machineRatePerHour;

  // 5. Complexity surcharge
  const complexitySurcharge = isComplex
    ? (materialCost + laborCost + machineCost) * (pricingConfig.complexityMultiplier - 1)
    : 0;

  // 6. Subtotal before shipping and discounts
  let subtotal = setupFee + materialCost + laborCost + machineCost + complexitySurcharge;

  // 7. Shipping cost
  let shippingCost = 0;
  let isFreeShipping = false;

  if (shippingEnabled && pricingConfig.shippingEnabled) {
    if (subtotal >= pricingConfig.freeShippingThreshold) {
      isFreeShipping = true;
      shippingCost = 0;
    } else {
      const weightKg = totalMaterialWeight / 1000;
      const maxDimension = Math.max(
        stlData.boundingBox.x,
        stlData.boundingBox.y,
        stlData.boundingBox.z
      );

      shippingCost =
        pricingConfig.shippingBaseRate +
        weightKg * pricingConfig.shippingRatePerKg +
        maxDimension * pricingConfig.shippingRatePerCm;
    }
  }

  // Add shipping to subtotal
  subtotal += shippingCost;

  // 8. Volume discount
  let discount = 0;
  let discountPercentage = 0;
  let discountType = '';

  for (const tier of pricingConfig.volumeDiscounts) {
    if (stlData.volume >= tier.minVolume) {
      discountPercentage = tier.discountPercent;
      discount = subtotal * (tier.discountPercent / 100);
      discountType = `Volume discount (${tier.discountPercent}%)`;
      break;
    }
  }

  // 9. Rush order fee
  let rushOrderFee = 0;
  if (rushOrder) {
    rushOrderFee = pricingConfig.rushOrderFee;
    // Also apply multiplier to labor and machine costs
    const rushMultiplierIncrease =
      (laborCost + machineCost) * (pricingConfig.rushOrderMultiplier - 1);
    rushOrderFee += rushMultiplierIncrease;
  }

  // 10. Calculate total before tax
  const totalBeforeTax = subtotal - discount + rushOrderFee;

  // 11. Tax
  const taxAmount = totalBeforeTax * pricingConfig.taxRate;

  // 12. Final total
  const total = totalBeforeTax + taxAmount;

  // Build cost breakdown
  const breakdown: CostBreakdown = {
    setupFee: parseFloat(setupFee.toFixed(2)),
    materialCost: parseFloat(materialCost.toFixed(2)),
    laborCost: parseFloat(laborCost.toFixed(2)),
    machineCost: parseFloat(machineCost.toFixed(2)),
    complexitySurcharge: parseFloat(complexitySurcharge.toFixed(2)),
    shippingCost: parseFloat(shippingCost.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    rushOrderFee: parseFloat(rushOrderFee.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };

  // Build complete quote
  const quote: DetailedQuote = {
    breakdown,

    model: {
      volume: parseFloat(stlData.volume.toFixed(2)),
      surfaceArea: parseFloat(stlData.surfaceArea.toFixed(2)),
      boundingBox: {
        x: parseFloat(stlData.boundingBox.x.toFixed(2)),
        y: parseFloat(stlData.boundingBox.y.toFixed(2)),
        z: parseFloat(stlData.boundingBox.z.toFixed(2)),
      },
      weight: parseFloat(totalMaterialWeight.toFixed(2)),
      complexity: parseFloat(complexity.toFixed(2)),
      isComplex,
    },

    material: {
      name: materialProps.name,
      costPerCm3: materialProps.costPerCm3,
      density: materialProps.density,
      totalMaterialVolume: parseFloat(totalMaterialVolume.toFixed(2)),
      totalMaterialWeight: parseFloat(totalMaterialWeight.toFixed(2)),
    },

    print: {
      estimatedTime: parseFloat(estimatedPrintTime.toFixed(2)),
      quality,
      infillPercentage,
      rushOrder,
    },

    validUntil: getQuoteValidityDate(7),
    createdAt: new Date(),
  };

  // Add shipping details if enabled
  if (shippingEnabled && pricingConfig.shippingEnabled) {
    quote.shipping = {
      weight: parseFloat(totalMaterialWeight.toFixed(2)),
      dimensions: {
        length: parseFloat(stlData.boundingBox.x.toFixed(2)),
        width: parseFloat(stlData.boundingBox.y.toFixed(2)),
        height: parseFloat(stlData.boundingBox.z.toFixed(2)),
      },
      cost: parseFloat(shippingCost.toFixed(2)),
      isFree: isFreeShipping,
    };
  }

  // Add discount details if applicable
  if (discount > 0) {
    quote.discount = {
      type: discountType,
      amount: parseFloat(discount.toFixed(2)),
      percentage: discountPercentage,
    };
  }

  return quote;
}

/**
 * Calculate complexity factor (surface area to volume ratio)
 */
export function calculateComplexity(stlData: STLData): {
  ratio: number;
  level: 'simple' | 'moderate' | 'complex' | 'very complex';
  description: string;
} {
  const ratio = stlData.surfaceArea / stlData.volume;

  let level: 'simple' | 'moderate' | 'complex' | 'very complex';
  let description: string;

  if (ratio < 5) {
    level = 'simple';
    description = 'Simple geometry, easy to print';
  } else if (ratio < 8) {
    level = 'moderate';
    description = 'Moderate complexity';
  } else if (ratio < 12) {
    level = 'complex';
    description = 'Complex geometry, may require supports';
  } else {
    level = 'very complex';
    description = 'Very complex geometry, extensive supports needed';
  }

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    level,
    description,
  };
}

/**
 * Calculate shipping cost based on weight and dimensions
 */
export function calculateShipping(
  weight: number, // grams
  dimensions: { x: number; y: number; z: number }, // cm
  config: Partial<EnhancedPricingConfig> = {}
): {
  cost: number;
  breakdown: {
    baseRate: number;
    weightCharge: number;
    sizeCharge: number;
  };
} {
  const pricingConfig = { ...DEFAULT_ENHANCED_CONFIG, ...config };

  const weightKg = weight / 1000;
  const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);

  const baseRate = pricingConfig.shippingBaseRate;
  const weightCharge = weightKg * pricingConfig.shippingRatePerKg;
  const sizeCharge = maxDimension * pricingConfig.shippingRatePerCm;

  const cost = baseRate + weightCharge + sizeCharge;

  return {
    cost: parseFloat(cost.toFixed(2)),
    breakdown: {
      baseRate: parseFloat(baseRate.toFixed(2)),
      weightCharge: parseFloat(weightCharge.toFixed(2)),
      sizeCharge: parseFloat(sizeCharge.toFixed(2)),
    },
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
 * Calculate quote validity period
 */
export function getQuoteValidityDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Generate printable quote summary
 */
export function generateQuoteSummary(quote: DetailedQuote): string {
  const lines: string[] = [];

  lines.push('=== 3D PRINTING QUOTE ===\n');

  lines.push('MODEL DETAILS:');
  lines.push(`  Volume: ${quote.model.volume} cm³`);
  lines.push(`  Surface Area: ${quote.model.surfaceArea} cm²`);
  lines.push(
    `  Dimensions: ${quote.model.boundingBox.x} × ${quote.model.boundingBox.y} × ${quote.model.boundingBox.z} cm`
  );
  lines.push(`  Weight: ${quote.model.weight}g`);
  lines.push(`  Complexity: ${quote.model.complexity.toFixed(2)} (${quote.model.isComplex ? 'Complex' : 'Standard'})\n`);

  lines.push('MATERIAL & PRINT:');
  lines.push(`  Material: ${quote.material.name}`);
  lines.push(`  Quality: ${quote.print.quality}`);
  lines.push(`  Infill: ${quote.print.infillPercentage}%`);
  lines.push(`  Estimated Time: ${quote.print.estimatedTime.toFixed(2)} hours\n`);

  lines.push('COST BREAKDOWN:');
  lines.push(`  Setup Fee: ${formatPrice(quote.breakdown.setupFee)}`);
  lines.push(`  Material: ${formatPrice(quote.breakdown.materialCost)}`);
  lines.push(`  Labor: ${formatPrice(quote.breakdown.laborCost)}`);
  lines.push(`  Machine Time: ${formatPrice(quote.breakdown.machineCost)}`);

  if (quote.breakdown.complexitySurcharge > 0) {
    lines.push(`  Complexity Surcharge: ${formatPrice(quote.breakdown.complexitySurcharge)}`);
  }

  if (quote.shipping && quote.breakdown.shippingCost > 0) {
    lines.push(`  Shipping: ${formatPrice(quote.breakdown.shippingCost)}`);
  }

  lines.push(`  Subtotal: ${formatPrice(quote.breakdown.subtotal)}`);

  if (quote.discount) {
    lines.push(`  Discount (${quote.discount.percentage}%): -${formatPrice(quote.discount.amount)}`);
  }

  if (quote.breakdown.rushOrderFee > 0) {
    lines.push(`  Rush Order Fee: ${formatPrice(quote.breakdown.rushOrderFee)}`);
  }

  if (quote.breakdown.taxAmount > 0) {
    lines.push(`  Tax: ${formatPrice(quote.breakdown.taxAmount)}`);
  }

  lines.push(`\n  TOTAL: ${formatPrice(quote.breakdown.total)}`);

  lines.push(`\nValid until: ${quote.validUntil.toLocaleDateString()}`);

  return lines.join('\n');
}

/**
 * Compare quotes for different materials
 */
export function compareQuotes(
  stlData: STLData,
  materials: string[],
  options: {
    infillPercentage?: number;
    quality?: 'draft' | 'standard' | 'high';
    rushOrder?: boolean;
    config?: Partial<EnhancedPricingConfig>;
  } = {}
): Array<{ material: string; quote: DetailedQuote }> {
  return materials.map((material) => ({
    material,
    quote: calculateDetailedQuote(stlData, { ...options, material }),
  }));
}
