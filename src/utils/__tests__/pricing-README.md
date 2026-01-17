# Pricing Calculator Tests

Comprehensive unit tests for the enhanced pricing calculator with itemized breakdowns.

## Running Tests

```bash
# Run all pricing tests
npm test -- pricing.test.ts

# Run tests in watch mode
npm run test:watch -- pricing.test.ts

# Run with coverage
npm run test:coverage -- pricing.test.ts
```

## Test Coverage

The test suite covers:

### 1. Detailed Quote Calculation
- ✅ Basic quote with all components (setup, material, labor, machine, shipping)
- ✅ Different material types (PLA, ABS, PETG, TPU, Nylon, Carbon Fiber, Resin)
- ✅ Quality multipliers (draft, standard, high)
- ✅ Infill percentage adjustments (0% to 100%)
- ✅ Weight calculations based on material density
- ✅ Complexity surcharges for complex geometries
- ✅ Volume discounts for large orders
- ✅ Rush order fees
- ✅ Shipping cost calculations
- ✅ Free shipping above threshold
- ✅ Tax calculations
- ✅ Validity dates

### 2. Complexity Analysis
- ✅ Complexity ratio calculation (surface area / volume)
- ✅ Classification levels: simple, moderate, complex, very complex
- ✅ Descriptive messages for each level
- ✅ Surcharge application for complex models

### 3. Shipping Calculations
- ✅ Base shipping rate
- ✅ Weight-based charges (per kg)
- ✅ Size-based charges (per cm of max dimension)
- ✅ Combined weight + size calculations
- ✅ Custom configuration support

### 4. Quote Comparisons
- ✅ Multi-material comparisons
- ✅ Option preservation across comparisons
- ✅ Side-by-side cost analysis

### 5. Quote Summary Generation
- ✅ Readable text summary
- ✅ All cost components included
- ✅ Discount display
- ✅ Complexity surcharge display
- ✅ Rush order fee display

### 6. Price Formatting
- ✅ USD formatting by default
- ✅ Multiple currency support
- ✅ Proper rounding
- ✅ Negative value handling

### 7. Material Database
- ✅ All 7 materials defined (PLA, ABS, PETG, TPU, Nylon, Carbon Fiber, Resin)
- ✅ Complete properties (cost, density, print speed, description)
- ✅ Reasonable value ranges

### 8. Edge Cases
- ✅ Very small volumes (0.1 cm³)
- ✅ Very large volumes (5000 cm³)
- ✅ Zero infill (vase mode)
- ✅ 100% infill (solid)
- ✅ Unknown materials (defaults to PLA)

### 9. Cost Calculation Accuracy
- ✅ Total equals sum of all components
- ✅ Subtotal calculation verification
- ✅ Discount application
- ✅ Tax calculation

## Material Properties

### PLA (Polylactic Acid)
- Cost: $0.04/cm³
- Density: 1.24 g/cm³
- Print Speed: 12 cm³/hour
- Description: Easy to print, biodegradable, great for beginners

### ABS (Acrylonitrile Butadiene Styrene)
- Cost: $0.05/cm³
- Density: 1.04 g/cm³
- Print Speed: 10 cm³/hour
- Description: Durable, heat-resistant, good for functional parts

### PETG (Polyethylene Terephthalate Glycol)
- Cost: $0.06/cm³
- Density: 1.27 g/cm³
- Print Speed: 10 cm³/hour
- Description: Strong, flexible, chemical resistant

### TPU (Thermoplastic Polyurethane)
- Cost: $0.12/cm³
- Density: 1.21 g/cm³
- Print Speed: 6 cm³/hour
- Description: Flexible, elastic, rubber-like properties

### Nylon (Polyamide)
- Cost: $0.15/cm³
- Density: 1.14 g/cm³
- Print Speed: 8 cm³/hour
- Description: Very strong, wear-resistant, ideal for mechanical parts

### Carbon Fiber Reinforced
- Cost: $0.25/cm³
- Density: 1.3 g/cm³
- Print Speed: 7 cm³/hour
- Description: Extremely strong, lightweight, premium material

### Resin (Standard)
- Cost: $0.18/cm³
- Density: 1.15 g/cm³
- Print Speed: 5 cm³/hour
- Description: High detail, smooth surface, great for miniatures

## Pricing Configuration

### Default Configuration

```typescript
{
  baseSetupFee: 5.0,              // One-time setup per order
  laborRatePerHour: 25.0,         // Hourly labor rate
  machineRatePerHour: 5.0,        // Machine operating cost per hour

  qualityMultipliers: {
    draft: 0.8,                   // 20% faster
    standard: 1.0,                // Standard speed
    high: 1.4,                    // 40% slower (higher quality)
  },

  complexityEnabled: true,
  complexityThreshold: 8.0,       // SA/V ratio > 8 is complex
  complexityMultiplier: 1.25,     // 25% surcharge for complex models

  shippingEnabled: true,
  shippingBaseRate: 5.0,
  shippingRatePerKg: 2.5,
  shippingRatePerCm: 0.1,
  freeShippingThreshold: 100.0,

  volumeDiscounts: [
    { minVolume: 1000, discountPercent: 20 },  // 1000+ cm³
    { minVolume: 500, discountPercent: 15 },   // 500+ cm³
    { minVolume: 200, discountPercent: 10 },   // 200+ cm³
    { minVolume: 100, discountPercent: 5 },    // 100+ cm³
  ],

  rushOrderMultiplier: 1.0,
  rushOrderFee: 15.0,              // Flat fee for rush orders

  taxRate: 0.0,                    // No tax by default
}
```

## Complexity Levels

| Ratio (SA/V) | Level | Description |
|--------------|-------|-------------|
| < 5 | Simple | Simple geometry, easy to print |
| 5-8 | Moderate | Moderate complexity |
| 8-12 | Complex | Complex geometry, may require supports |
| > 12 | Very Complex | Extensive supports needed |

## Volume Discounts

| Volume | Discount |
|--------|----------|
| 100+ cm³ | 5% |
| 200+ cm³ | 10% |
| 500+ cm³ | 15% |
| 1000+ cm³ | 20% |

## Example Quote Breakdown

For an 8 cm³ PLA model with 20% infill, standard quality:

```
=== 3D PRINTING QUOTE ===

MODEL DETAILS:
  Volume: 8 cm³
  Surface Area: 24 cm²
  Dimensions: 2 × 2 × 2 cm
  Weight: 12.4g
  Complexity: 3.00 (Standard)

MATERIAL & PRINT:
  Material: PLA (Polylactic Acid)
  Quality: standard
  Infill: 20%
  Estimated Time: 0.8 hours

COST BREAKDOWN:
  Setup Fee: $5.00
  Material: $0.38
  Labor: $20.00
  Machine Time: $4.00
  Subtotal: $29.38

  TOTAL: $29.38

Valid until: [7 days from now]
```

## Test Scenarios

### Scenario 1: Basic PLA Print
- Volume: 8 cm³
- Material: PLA
- Quality: Standard
- Infill: 20%
- Expected: ~$29 total

### Scenario 2: High-Quality Resin Print
- Volume: 8 cm³
- Material: Resin
- Quality: High
- Infill: 50%
- Expected: ~$50+ total (higher material cost, longer print time)

### Scenario 3: Large PLA Print with Discount
- Volume: 125 cm³
- Material: PLA
- Quality: Standard
- Infill: 20%
- Expected: 5% discount applied

### Scenario 4: Complex Carbon Fiber Print
- Volume: 10 cm³
- Surface Area: 100 cm² (SA/V = 10, complex)
- Material: Carbon Fiber
- Quality: High
- Expected: Premium material cost + complexity surcharge

### Scenario 5: Rush Order
- Volume: 8 cm³
- Material: PLA
- Rush Order: Yes
- Expected: +$15 rush fee

## Expected Test Results

All 80+ tests should pass with the following success rate:

```
Test Suites: 1 passed, 1 total
Tests:       80+ passed, 80+ total
Snapshots:   0 total
Time:        ~3s
```

## Coverage Goals

- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 85%+
- **Statements**: 85%+

## Adding New Tests

To add new test cases:

1. Add test data in the describe block
2. Use the helper functions to create STL data
3. Test expected behavior with assertions
4. Update this README if adding new categories

## Troubleshooting

Common issues and solutions:

1. **Floating point precision errors**: Use `toBeCloseTo(expected, decimalPlaces)` instead of `toBe()`
2. **Material not found**: Ensure material name exactly matches key in MATERIAL_DATABASE
3. **Unexpected discount**: Check volume meets minimum threshold
4. **Missing shipping**: Ensure `shippingEnabled: true` is set

## Performance

Expected performance on modern hardware:

- Single quote calculation: <1ms
- Material comparison (5 materials): <5ms
- Quote summary generation: <1ms
- Shipping calculation: <1ms

## Future Test Improvements

- [ ] Test with real-world STL files and pricing data
- [ ] Test currency conversion
- [ ] Test bulk order discounts
- [ ] Test seasonal pricing adjustments
- [ ] Test custom material definitions
- [ ] Integration tests with database
- [ ] Performance benchmarks with large datasets
