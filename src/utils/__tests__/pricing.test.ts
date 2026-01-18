import {
  calculateDetailedQuote,
  calculateComplexity,
  calculateShipping,
  compareQuotes,
  generateQuoteSummary,
  MATERIAL_DATABASE,
  DEFAULT_ENHANCED_CONFIG,
  formatPrice,
} from '../pricing-enhanced';
import { STLData } from '@/types';

describe('Enhanced Pricing Calculator', () => {
  // Sample STL data for testing
  const sampleSTLData: STLData = {
    vertices: 36,
    triangles: 12,
    volume: 8, // 8 cm³
    surfaceArea: 24, // 24 cm²
    boundingBox: {
      x: 2,
      y: 2,
      z: 2,
    },
    isValid: true,
  };

  const largeSTLData: STLData = {
    vertices: 1200,
    triangles: 400,
    volume: 125, // 125 cm³ - qualifies for 5% discount
    surfaceArea: 150,
    boundingBox: {
      x: 5,
      y: 5,
      z: 5,
    },
    isValid: true,
  };

  const complexSTLData: STLData = {
    vertices: 3000,
    triangles: 1000,
    volume: 10, // 10 cm³
    surfaceArea: 100, // High surface area to volume ratio
    boundingBox: {
      x: 3,
      y: 3,
      z: 3,
    },
    isValid: true,
  };

  describe('calculateDetailedQuote', () => {
    it('should calculate a basic quote with all components', () => {
      const quote = calculateDetailedQuote(sampleSTLData);

      expect(quote).toBeDefined();
      expect(quote.breakdown).toBeDefined();
      expect(quote.model).toBeDefined();
      expect(quote.material).toBeDefined();
      expect(quote.print).toBeDefined();

      // Verify all cost components are present
      expect(quote.breakdown.setupFee).toBeGreaterThan(0);
      expect(quote.breakdown.materialCost).toBeGreaterThan(0);
      expect(quote.breakdown.laborCost).toBeGreaterThan(0);
      expect(quote.breakdown.machineCost).toBeGreaterThan(0);
      expect(quote.breakdown.total).toBeGreaterThan(0);
    });

    it('should calculate different prices for different materials', () => {
      const plaQuote = calculateDetailedQuote(sampleSTLData, { material: 'PLA' });
      const absQuote = calculateDetailedQuote(sampleSTLData, { material: 'ABS' });
      const resinQuote = calculateDetailedQuote(sampleSTLData, { material: 'Resin' });

      // Resin should be more expensive than ABS, which should be more expensive than PLA
      expect(resinQuote.breakdown.materialCost).toBeGreaterThan(absQuote.breakdown.materialCost);
      expect(absQuote.breakdown.materialCost).toBeGreaterThan(plaQuote.breakdown.materialCost);
    });

    it('should apply quality multipliers correctly', () => {
      const draftQuote = calculateDetailedQuote(sampleSTLData, { quality: 'draft' });
      const standardQuote = calculateDetailedQuote(sampleSTLData, { quality: 'standard' });
      const highQuote = calculateDetailedQuote(sampleSTLData, { quality: 'high' });

      // Higher quality should take longer and cost more
      expect(highQuote.print.estimatedTime).toBeGreaterThan(standardQuote.print.estimatedTime);
      expect(standardQuote.print.estimatedTime).toBeGreaterThan(draftQuote.print.estimatedTime);

      expect(highQuote.breakdown.total).toBeGreaterThan(standardQuote.breakdown.total);
      expect(standardQuote.breakdown.total).toBeGreaterThan(draftQuote.breakdown.total);
    });

    it('should adjust price based on infill percentage', () => {
      const lowInfill = calculateDetailedQuote(sampleSTLData, { infillPercentage: 10 });
      const midInfill = calculateDetailedQuote(sampleSTLData, { infillPercentage: 50 });
      const highInfill = calculateDetailedQuote(sampleSTLData, { infillPercentage: 100 });

      // Higher infill should use more material and take longer
      expect(highInfill.material.totalMaterialVolume).toBeGreaterThan(
        midInfill.material.totalMaterialVolume
      );
      expect(midInfill.material.totalMaterialVolume).toBeGreaterThan(
        lowInfill.material.totalMaterialVolume
      );

      expect(highInfill.breakdown.total).toBeGreaterThan(midInfill.breakdown.total);
      expect(midInfill.breakdown.total).toBeGreaterThan(lowInfill.breakdown.total);
    });

    it('should calculate correct weight based on material density', () => {
      const plaQuote = calculateDetailedQuote(sampleSTLData, { material: 'PLA' });
      const absQuote = calculateDetailedQuote(sampleSTLData, { material: 'ABS' });

      // PLA density: 1.24 g/cm³, ABS density: 1.04 g/cm³
      // For same volume, PLA should weigh more
      expect(plaQuote.model.weight).toBeGreaterThan(absQuote.model.weight);
    });

    it('should apply complexity surcharge for complex models', () => {
      const complexQuote = calculateDetailedQuote(complexSTLData);
      const simpleQuote = calculateDetailedQuote(sampleSTLData);

      // Complex model should have complexity surcharge
      expect(complexQuote.model.isComplex).toBe(true);
      expect(complexQuote.breakdown.complexitySurcharge).toBeGreaterThan(0);

      // Simple model should not have complexity surcharge
      expect(simpleQuote.model.isComplex).toBe(false);
      expect(simpleQuote.breakdown.complexitySurcharge).toBe(0);
    });

    it('should apply volume discounts for large orders', () => {
      const quote = calculateDetailedQuote(largeSTLData);

      // Should have a discount applied
      expect(quote.discount).toBeDefined();
      expect(quote.discount!.amount).toBeGreaterThan(0);
      expect(quote.discount!.percentage).toBeGreaterThan(0);
    });

    it('should not apply discount for small orders', () => {
      const quote = calculateDetailedQuote(sampleSTLData);

      // Should not have a discount
      expect(quote.discount).toBeUndefined();
      expect(quote.breakdown.discount).toBe(0);
    });

    it('should add rush order fee when requested', () => {
      const normalQuote = calculateDetailedQuote(sampleSTLData, { rushOrder: false });
      const rushQuote = calculateDetailedQuote(sampleSTLData, { rushOrder: true });

      expect(rushQuote.print.rushOrder).toBe(true);
      expect(rushQuote.breakdown.rushOrderFee).toBeGreaterThan(0);
      expect(rushQuote.breakdown.total).toBeGreaterThan(normalQuote.breakdown.total);
    });

    it('should calculate shipping cost when enabled', () => {
      const quote = calculateDetailedQuote(sampleSTLData, { shippingEnabled: true });

      expect(quote.shipping).toBeDefined();
      expect(quote.shipping!.cost).toBeGreaterThan(0);
      expect(quote.shipping!.weight).toBeGreaterThan(0);
    });

    it('should offer free shipping above threshold', () => {
      const config = {
        freeShippingThreshold: 10, // Very low threshold
      };

      const quote = calculateDetailedQuote(sampleSTLData, {
        shippingEnabled: true,
        config,
      });

      expect(quote.shipping).toBeDefined();
      expect(quote.shipping!.isFree).toBe(true);
      expect(quote.breakdown.shippingCost).toBe(0);
    });

    it('should not include shipping when disabled', () => {
      const quote = calculateDetailedQuote(sampleSTLData, { shippingEnabled: false });

      expect(quote.shipping).toBeUndefined();
      expect(quote.breakdown.shippingCost).toBe(0);
    });

    it('should apply tax when configured', () => {
      const config = {
        taxRate: 0.08, // 8% tax
      };

      const quote = calculateDetailedQuote(sampleSTLData, { config });

      expect(quote.breakdown.taxAmount).toBeGreaterThan(0);
      // Tax should be approximately 8% of subtotal
      const expectedTax = (quote.breakdown.subtotal - quote.breakdown.discount) * 0.08;
      expect(quote.breakdown.taxAmount).toBeCloseTo(expectedTax, 1);
    });

    it('should include validity dates', () => {
      const quote = calculateDetailedQuote(sampleSTLData);

      expect(quote.createdAt).toBeInstanceOf(Date);
      expect(quote.validUntil).toBeInstanceOf(Date);
      expect(quote.validUntil.getTime()).toBeGreaterThan(quote.createdAt.getTime());
    });

    it('should handle all supported materials', () => {
      const materials = ['PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 'Carbon Fiber', 'Resin'];

      materials.forEach((material) => {
        const quote = calculateDetailedQuote(sampleSTLData, { material });

        expect(quote.material.name).toBe(MATERIAL_DATABASE[material].name);
        expect(quote.breakdown.total).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity ratio', () => {
      const complexity = calculateComplexity(sampleSTLData);

      expect(complexity.ratio).toBe(3); // 24 / 8 = 3
      expect(complexity.level).toBe('simple');
      expect(complexity.description).toBeDefined();
    });

    it('should classify simple models correctly', () => {
      const simpleData: STLData = {
        ...sampleSTLData,
        surfaceArea: 20,
        volume: 10, // Ratio = 2
      };

      const complexity = calculateComplexity(simpleData);
      expect(complexity.level).toBe('simple');
    });

    it('should classify moderate models correctly', () => {
      const moderateData: STLData = {
        ...sampleSTLData,
        surfaceArea: 60,
        volume: 10, // Ratio = 6
      };

      const complexity = calculateComplexity(moderateData);
      expect(complexity.level).toBe('moderate');
    });

    it('should classify complex models correctly', () => {
      const complexity = calculateComplexity(complexSTLData);
      expect(complexity.level).toBe('complex');
    });

    it('should classify very complex models correctly', () => {
      const veryComplexData: STLData = {
        ...sampleSTLData,
        surfaceArea: 150,
        volume: 10, // Ratio = 15
      };

      const complexity = calculateComplexity(veryComplexData);
      expect(complexity.level).toBe('very complex');
    });
  });

  describe('calculateShipping', () => {
    it('should calculate shipping cost based on weight and dimensions', () => {
      const shipping = calculateShipping(100, { x: 10, y: 10, z: 10 });

      expect(shipping.cost).toBeGreaterThan(0);
      expect(shipping.breakdown.baseRate).toBe(DEFAULT_ENHANCED_CONFIG.shippingBaseRate);
      expect(shipping.breakdown.weightCharge).toBeGreaterThan(0);
      expect(shipping.breakdown.sizeCharge).toBeGreaterThan(0);
    });

    it('should charge more for heavier packages', () => {
      const light = calculateShipping(100, { x: 10, y: 10, z: 10 });
      const heavy = calculateShipping(1000, { x: 10, y: 10, z: 10 });

      expect(heavy.cost).toBeGreaterThan(light.cost);
      expect(heavy.breakdown.weightCharge).toBeGreaterThan(light.breakdown.weightCharge);
    });

    it('should charge more for larger packages', () => {
      const small = calculateShipping(100, { x: 5, y: 5, z: 5 });
      const large = calculateShipping(100, { x: 20, y: 20, z: 20 });

      expect(large.cost).toBeGreaterThan(small.cost);
      expect(large.breakdown.sizeCharge).toBeGreaterThan(small.breakdown.sizeCharge);
    });

    it('should use custom configuration when provided', () => {
      const customConfig = {
        shippingBaseRate: 10,
        shippingRatePerKg: 5,
        shippingRatePerCm: 0.5,
      };

      const shipping = calculateShipping(100, { x: 10, y: 10, z: 10 }, customConfig);

      expect(shipping.breakdown.baseRate).toBe(10);
    });
  });

  describe('compareQuotes', () => {
    it('should compare quotes for multiple materials', () => {
      const materials = ['PLA', 'ABS', 'PETG'];
      const quotes = compareQuotes(sampleSTLData, materials);

      expect(quotes).toHaveLength(3);
      expect(quotes[0].material).toBe('PLA');
      expect(quotes[1].material).toBe('ABS');
      expect(quotes[2].material).toBe('PETG');

      // Each quote should be valid
      quotes.forEach((q) => {
        expect(q.quote.breakdown.total).toBeGreaterThan(0);
      });
    });

    it('should allow comparison with different options', () => {
      const materials = ['PLA', 'Resin'];
      const quotes = compareQuotes(sampleSTLData, materials, {
        quality: 'high',
        infillPercentage: 50,
        rushOrder: true,
      });

      quotes.forEach((q) => {
        expect(q.quote.print.quality).toBe('high');
        expect(q.quote.print.infillPercentage).toBe(50);
        expect(q.quote.print.rushOrder).toBe(true);
      });
    });
  });

  describe('generateQuoteSummary', () => {
    it('should generate a readable quote summary', () => {
      const quote = calculateDetailedQuote(sampleSTLData);
      const summary = generateQuoteSummary(quote);

      expect(summary).toContain('3D PRINTING QUOTE');
      expect(summary).toContain('MODEL DETAILS');
      expect(summary).toContain('MATERIAL & PRINT');
      expect(summary).toContain('COST BREAKDOWN');
      expect(summary).toContain('TOTAL');
      expect(summary).toContain(quote.material.name);
    });

    it('should include all cost components in summary', () => {
      const quote = calculateDetailedQuote(sampleSTLData, { rushOrder: true });
      const summary = generateQuoteSummary(quote);

      expect(summary).toContain('Setup Fee');
      expect(summary).toContain('Material');
      expect(summary).toContain('Labor');
      expect(summary).toContain('Machine Time');
      expect(summary).toContain('Rush Order Fee');
    });

    it('should show discount when applicable', () => {
      const quote = calculateDetailedQuote(largeSTLData);
      const summary = generateQuoteSummary(quote);

      expect(summary).toContain('Discount');
    });

    it('should show complexity surcharge for complex models', () => {
      const quote = calculateDetailedQuote(complexSTLData);
      const summary = generateQuoteSummary(quote);

      if (quote.breakdown.complexitySurcharge > 0) {
        expect(summary).toContain('Complexity Surcharge');
      }
    });
  });

  describe('formatPrice', () => {
    it('should format prices in USD by default', () => {
      const formatted = formatPrice(42.99);
      expect(formatted).toBe('$42.99');
    });

    it('should format prices in different currencies', () => {
      const usd = formatPrice(42.99, 'USD');
      const eur = formatPrice(42.99, 'EUR');
      const gbp = formatPrice(42.99, 'GBP');

      expect(usd).toContain('42.99');
      expect(eur).toContain('42.99');
      expect(gbp).toContain('42.99');
    });

    it('should handle zero and negative values', () => {
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(-10)).toContain('-');
    });

    it('should round to 2 decimal places', () => {
      const formatted = formatPrice(42.999);
      expect(formatted).toBe('$43.00');
    });
  });

  describe('Material Database', () => {
    it('should have all expected materials', () => {
      const expectedMaterials = ['PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 'Carbon Fiber', 'Resin'];

      expectedMaterials.forEach((material) => {
        expect(MATERIAL_DATABASE[material]).toBeDefined();
        expect(MATERIAL_DATABASE[material].name).toBeDefined();
        expect(MATERIAL_DATABASE[material].costPerCm3).toBeGreaterThan(0);
        expect(MATERIAL_DATABASE[material].density).toBeGreaterThan(0);
        expect(MATERIAL_DATABASE[material].printSpeed).toBeGreaterThan(0);
      });
    });

    it('should have reasonable material properties', () => {
      Object.values(MATERIAL_DATABASE).forEach((material) => {
        // Cost should be between $0.01 and $1.00 per cm³
        expect(material.costPerCm3).toBeGreaterThan(0.01);
        expect(material.costPerCm3).toBeLessThan(1.0);

        // Density should be between 0.5 and 2.0 g/cm³
        expect(material.density).toBeGreaterThan(0.5);
        expect(material.density).toBeLessThan(2.0);

        // Print speed should be between 1 and 20 cm³/hour
        expect(material.printSpeed).toBeGreaterThan(1);
        expect(material.printSpeed).toBeLessThan(20);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small volumes', () => {
      const tinyData: STLData = {
        ...sampleSTLData,
        volume: 0.1,
        surfaceArea: 2,
      };

      const quote = calculateDetailedQuote(tinyData);
      expect(quote.breakdown.total).toBeGreaterThan(0);
      expect(quote.breakdown.setupFee).toBeGreaterThan(0); // Setup fee should still apply
    });

    it('should handle very large volumes', () => {
      const hugeData: STLData = {
        ...sampleSTLData,
        volume: 5000,
        surfaceArea: 3000,
      };

      const quote = calculateDetailedQuote(hugeData);
      expect(quote.breakdown.total).toBeGreaterThan(0);
      expect(quote.discount).toBeDefined(); // Should get max discount
    });

    it('should handle zero infill (vase mode)', () => {
      const quote = calculateDetailedQuote(sampleSTLData, { infillPercentage: 0 });
      expect(quote.material.totalMaterialVolume).toBeCloseTo(sampleSTLData.volume, 1);
    });

    it('should handle 100% infill (solid)', () => {
      const quote = calculateDetailedQuote(sampleSTLData, { infillPercentage: 100 });
      expect(quote.material.totalMaterialVolume).toBeGreaterThan(sampleSTLData.volume);
    });

    it('should handle unknown materials gracefully', () => {
      const quote = calculateDetailedQuote(sampleSTLData, { material: 'UnknownMaterial' });
      // Should default to PLA
      expect(quote.material.name).toBe(MATERIAL_DATABASE.PLA.name);
    });
  });

  describe('Cost Calculation Accuracy', () => {
    it('should have consistent cost breakdown that adds up to total', () => {
      const quote = calculateDetailedQuote(sampleSTLData);

      const calculatedTotal =
        quote.breakdown.subtotal -
        quote.breakdown.discount +
        quote.breakdown.rushOrderFee +
        quote.breakdown.taxAmount;

      expect(quote.breakdown.total).toBeCloseTo(calculatedTotal, 2);
    });

    it('should have consistent subtotal calculation', () => {
      const quote = calculateDetailedQuote(sampleSTLData);

      const calculatedSubtotal =
        quote.breakdown.setupFee +
        quote.breakdown.materialCost +
        quote.breakdown.laborCost +
        quote.breakdown.machineCost +
        quote.breakdown.complexitySurcharge +
        quote.breakdown.shippingCost;

      expect(quote.breakdown.subtotal).toBeCloseTo(calculatedSubtotal, 2);
    });
  });
});
