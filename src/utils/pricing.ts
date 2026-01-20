/**
 * Pricing Calculator - Main entry point
 * Re-exports the enhanced pricing calculator with legacy support
 */

// Export all enhanced pricing functionality
export * from './pricing-enhanced';

// Legacy support - re-export old functions (excluding duplicates)
export {
  DEFAULT_PRICING_CONFIG,
  calculateQuote,
  calculateVolumeDiscount,
  applyVolumeDiscount,
} from './pricing-legacy';
export type { CalculateQuoteParams, QuoteCalculation } from './pricing-legacy';
