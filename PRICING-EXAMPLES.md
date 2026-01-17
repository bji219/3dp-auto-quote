# Pricing Calculator - Usage Examples

This guide demonstrates how to use the enhanced pricing calculator with real-world examples.

## Basic Usage

```typescript
import { calculateDetailedQuote } from '@/utils/pricing';
import { parseSTL } from '@/utils/stl-parser';

// Parse an STL file
const buffer = await file.arrayBuffer();
const stlData = await parseSTL(buffer);

// Calculate a basic quote with PLA
const quote = calculateDetailedQuote(stlData);

console.log(`Total: $${quote.breakdown.total}`);
console.log(`Estimated print time: ${quote.print.estimatedTime} hours`);
```

## Example 1: Small PLA Print (Standard Quality)

```typescript
const smallModel: STLData = {
  vertices: 36,
  triangles: 12,
  volume: 8, // 8 cm³
  surfaceArea: 24, // 24 cm²
  boundingBox: { x: 2, y: 2, z: 2 },
  isValid: true,
};

const quote = calculateDetailedQuote(smallModel, {
  material: 'PLA',
  quality: 'standard',
  infillPercentage: 20,
});

// Result:
// {
//   breakdown: {
//     setupFee: 5.00,
//     materialCost: 0.38,      // 8 × 1.1 (infill) × 0.04
//     laborCost: 20.00,        // 0.8 hours × $25/hour
//     machineCost: 4.00,       // 0.8 hours × $5/hour
//     complexitySurcharge: 0,
//     shippingCost: 5.13,
//     subtotal: 34.51,
//     discount: 0,
//     rushOrderFee: 0,
//     taxAmount: 0,
//     total: 34.51
//   },
//   model: {
//     volume: 8,
//     weight: 10.91,           // 8 × 1.1 × 1.24 (PLA density)
//     complexity: 3.0,          // 24 / 8
//     isComplex: false
//   },
//   print: {
//     estimatedTime: 0.8       // 8 / 12 × 1.0 × 1.1
//   }
// }
```

## Example 2: High-Quality Resin Print

```typescript
const detailedModel: STLData = {
  volume: 5,
  surfaceArea: 30,
  boundingBox: { x: 1.5, y: 1.5, z: 2.5 },
  isValid: true,
};

const quote = calculateDetailedQuote(detailedModel, {
  material: 'Resin',
  quality: 'high',
  infillPercentage: 50,
  shippingEnabled: true,
});

// Result:
// - Material: Resin ($0.18/cm³) - more expensive than PLA
// - Quality: High (1.4× time multiplier)
// - Infill: 50% (more material needed)
// - Total: ~$45-50 (higher than PLA due to premium material and quality)
```

## Example 3: Large Print with Volume Discount

```typescript
const largeModel: STLData = {
  volume: 250, // 250 cm³ - qualifies for 10% discount
  surfaceArea: 300,
  boundingBox: { x: 6, y: 6, z: 7 },
  isValid: true,
};

const quote = calculateDetailedQuote(largeModel, {
  material: 'PETG',
  quality: 'standard',
  infillPercentage: 30,
});

// Result:
// {
//   breakdown: {
//     subtotal: 250.00,
//     discount: 25.00,         // 10% volume discount
//     total: 225.00
//   },
//   discount: {
//     type: 'Volume discount (10%)',
//     amount: 25.00,
//     percentage: 10
//   }
// }
```

## Example 4: Complex Geometry with Surcharge

```typescript
const complexModel: STLData = {
  volume: 10,
  surfaceArea: 100, // SA/V ratio = 10 (complex)
  boundingBox: { x: 3, y: 3, z: 3 },
  isValid: true,
};

const quote = calculateDetailedQuote(complexModel, {
  material: 'Carbon Fiber',
  quality: 'high',
});

// Result:
// {
//   model: {
//     complexity: 10.0,
//     isComplex: true          // SA/V > 8
//   },
//   breakdown: {
//     materialCost: 35.00,
//     laborCost: 45.00,
//     machineCost: 9.00,
//     complexitySurcharge: 22.25,  // 25% surcharge
//     total: 116.38
//   }
// }
```

## Example 5: Rush Order

```typescript
const urgentModel: STLData = {
  volume: 15,
  surfaceArea: 45,
  boundingBox: { x: 2.5, y: 2.5, z: 2.5 },
  isValid: true,
};

const quote = calculateDetailedQuote(urgentModel, {
  material: 'ABS',
  rushOrder: true,
});

// Result:
// {
//   breakdown: {
//     rushOrderFee: 15.00,     // Flat $15 fee
//     total: 65.00             // Higher than normal due to rush fee
//   },
//   print: {
//     rushOrder: true
//   }
// }
```

## Example 6: Compare Materials

```typescript
const model: STLData = {
  volume: 20,
  surfaceArea: 60,
  boundingBox: { x: 3, y: 3, z: 2.5 },
  isValid: true,
};

const comparisons = compareQuotes(
  model,
  ['PLA', 'ABS', 'PETG', 'Carbon Fiber'],
  { quality: 'standard', infillPercentage: 25 }
);

comparisons.forEach(({ material, quote }) => {
  console.log(`${material}: $${quote.breakdown.total}`);
  console.log(`  Weight: ${quote.model.weight}g`);
  console.log(`  Time: ${quote.print.estimatedTime}h`);
});

// Output:
// PLA: $45.50
//   Weight: 62g
//   Time: 1.85h
// ABS: $48.75
//   Weight: 52g
//   Time: 2.08h
// PETG: $52.00
//   Weight: 63.5g
//   Time: 2.08h
// Carbon Fiber: $125.00
//   Weight: 65g
//   Time: 2.97h
```

## Example 7: Custom Configuration

```typescript
const customConfig = {
  baseSetupFee: 10.0,          // Higher setup fee
  laborRatePerHour: 30.0,      // Higher labor rate
  machineRatePerHour: 8.0,     // Higher machine rate

  shippingEnabled: true,
  shippingBaseRate: 7.50,      // Higher base shipping
  freeShippingThreshold: 75.0, // Lower free shipping threshold

  taxRate: 0.08,               // 8% sales tax

  volumeDiscounts: [
    { minVolume: 50, discountPercent: 5 },
    { minVolume: 150, discountPercent: 12 },
    { minVolume: 500, discountPercent: 20 },
  ],
};

const quote = calculateDetailedQuote(model, {
  material: 'Nylon',
  config: customConfig,
});

// Uses your custom pricing structure
```

## Example 8: Free Shipping

```typescript
const model: STLData = {
  volume: 150,
  surfaceArea: 200,
  boundingBox: { x: 5, y: 5, z: 6 },
  isValid: true,
};

const quote = calculateDetailedQuote(model, {
  material: 'PETG',
  shippingEnabled: true,
});

// If subtotal > $100, shipping is free:
// {
//   shipping: {
//     cost: 0,
//     isFree: true
//   },
//   breakdown: {
//     shippingCost: 0
//   }
// }
```

## Example 9: Generate Printable Quote

```typescript
const quote = calculateDetailedQuote(model, {
  material: 'PLA',
  quality: 'high',
  infillPercentage: 40,
});

const summary = generateQuoteSummary(quote);
console.log(summary);

// Output:
// === 3D PRINTING QUOTE ===
//
// MODEL DETAILS:
//   Volume: 20 cm³
//   Surface Area: 60 cm²
//   Dimensions: 3 × 3 × 2.5 cm
//   Weight: 34.72g
//   Complexity: 3.00 (Standard)
//
// MATERIAL & PRINT:
//   Material: PLA (Polylactic Acid)
//   Quality: high
//   Infill: 40%
//   Estimated Time: 2.59 hours
//
// COST BREAKDOWN:
//   Setup Fee: $5.00
//   Material: $1.12
//   Labor: $64.75
//   Machine Time: $12.95
//   Shipping: $5.42
//   Subtotal: $89.24
//
//   TOTAL: $89.24
//
// Valid until: 01/24/2026
```

## Example 10: Complexity Analysis

```typescript
const models = [
  { name: 'Cube', volume: 8, surfaceArea: 24 },      // Simple
  { name: 'Sphere', volume: 10, surfaceArea: 50 },   // Moderate
  { name: 'Lattice', volume: 10, surfaceArea: 95 },  // Complex
  { name: 'Tree', volume: 5, surfaceArea: 80 },      // Very Complex
];

models.forEach(({ name, volume, surfaceArea }) => {
  const stlData: STLData = {
    volume,
    surfaceArea,
    boundingBox: { x: 2, y: 2, z: 2 },
    isValid: true,
  };

  const complexity = calculateComplexity(stlData);
  console.log(`${name}: ${complexity.level} (ratio: ${complexity.ratio})`);
});

// Output:
// Cube: simple (ratio: 3.00)
// Sphere: moderate (ratio: 5.00)
// Lattice: complex (ratio: 9.50)
// Tree: very complex (ratio: 16.00)
```

## Example 11: Shipping Calculator

```typescript
// Calculate shipping separately
const shipping = calculateShipping(
  250,                          // 250g weight
  { x: 10, y: 8, z: 6 }        // 10cm max dimension
);

console.log(`Total shipping: $${shipping.cost}`);
console.log(`  Base rate: $${shipping.breakdown.baseRate}`);
console.log(`  Weight charge: $${shipping.breakdown.weightCharge}`);
console.log(`  Size charge: $${shipping.breakdown.sizeCharge}`);

// Output:
// Total shipping: $6.13
//   Base rate: $5.00
//   Weight charge: $0.63  (0.25kg × $2.50)
//   Size charge: $1.00    (10cm × $0.10)
```

## Example 12: Tax Calculation

```typescript
const quote = calculateDetailedQuote(model, {
  material: 'ABS',
  config: {
    taxRate: 0.0825,  // 8.25% tax (e.g., California)
  },
});

// Tax is applied to the total after discounts and rush fees:
// {
//   breakdown: {
//     subtotal: 50.00,
//     discount: 0,
//     rushOrderFee: 0,
//     taxAmount: 4.13,      // (50.00 - 0 + 0) × 0.0825
//     total: 54.13
//   }
// }
```

## Integration with STL Parser

```typescript
// Complete workflow from file upload to quote
async function getQuoteFromFile(file: File) {
  // 1. Parse the STL file
  const buffer = await file.arrayBuffer();
  const stlData = await parseSTL(buffer);

  if (!stlData.isValid) {
    throw new Error(`Invalid STL file: ${stlData.errors?.join(', ')}`);
  }

  // 2. Analyze complexity
  const complexity = calculateComplexity(stlData);
  console.log(`Model complexity: ${complexity.level}`);

  // 3. Calculate quote
  const quote = calculateDetailedQuote(stlData, {
    material: 'PLA',
    quality: 'standard',
    infillPercentage: 20,
    shippingEnabled: true,
  });

  // 4. Generate summary
  const summary = generateQuoteSummary(quote);

  return {
    quote,
    summary,
    complexity,
  };
}
```

## Pro Tips

### Tip 1: Always Check Complexity
Complex models may require supports and additional post-processing:

```typescript
const complexity = calculateComplexity(stlData);
if (complexity.level === 'complex' || complexity.level === 'very complex') {
  console.warn('This model may require extensive support structures');
}
```

### Tip 2: Compare Materials for Best Value
```typescript
const materials = ['PLA', 'ABS', 'PETG'];
const quotes = compareQuotes(stlData, materials);
const cheapest = quotes.sort((a, b) =>
  a.quote.breakdown.total - b.quote.breakdown.total
)[0];
console.log(`Best value: ${cheapest.material} at $${cheapest.quote.breakdown.total}`);
```

### Tip 3: Optimize Infill for Cost Savings
```typescript
const lowInfill = calculateDetailedQuote(stlData, { infillPercentage: 15 });
const highInfill = calculateDetailedQuote(stlData, { infillPercentage: 50 });
const savings = highInfill.breakdown.total - lowInfill.breakdown.total;
console.log(`Savings with lower infill: $${savings.toFixed(2)}`);
```

### Tip 4: Use Draft Quality for Prototypes
```typescript
const draftQuote = calculateDetailedQuote(stlData, { quality: 'draft' });
const highQuote = calculateDetailedQuote(stlData, { quality: 'high' });
const timeSaved = highQuote.print.estimatedTime - draftQuote.print.estimatedTime;
console.log(`Draft mode saves ${timeSaved.toFixed(1)} hours`);
```

## Common Pricing Scenarios

### Scenario: Hobbyist Pricing
```typescript
const hobbyistConfig = {
  baseSetupFee: 3.0,
  laborRatePerHour: 15.0,
  machineRatePerHour: 3.0,
  shippingEnabled: false,
  taxRate: 0,
};
```

### Scenario: Professional Service
```typescript
const professionalConfig = {
  baseSetupFee: 10.0,
  laborRatePerHour: 40.0,
  machineRatePerHour: 10.0,
  shippingEnabled: true,
  taxRate: 0.08,
  freeShippingThreshold: 150.0,
};
```

### Scenario: Bulk Orders
```typescript
const bulkConfig = {
  volumeDiscounts: [
    { minVolume: 50, discountPercent: 10 },
    { minVolume: 200, discountPercent: 20 },
    { minVolume: 1000, discountPercent: 30 },
  ],
};
```

## Conclusion

The enhanced pricing calculator provides flexible, transparent pricing with:
- ✅ Multiple material support
- ✅ Complexity analysis
- ✅ Shipping calculations
- ✅ Volume discounts
- ✅ Rush order handling
- ✅ Configurable parameters
- ✅ Itemized breakdowns

For more details, see the [Pricing Test Documentation](./src/utils/__tests__/pricing-README.md).
