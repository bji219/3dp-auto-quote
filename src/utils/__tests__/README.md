# STL Parser Tests

Comprehensive unit tests for the enhanced STL file parser.

## Running Tests

```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The test suite covers:

### 1. Binary STL Parsing
- Valid binary STL files (various sizes)
- Binary STL files starting with "solid" (edge case)
- Binary STL files with NaN/invalid values
- Large and small models
- Volume, surface area, and bounding box calculations

### 2. ASCII STL Parsing
- Valid ASCII STL files (various sizes)
- ASCII STL with invalid vertices
- Malformed ASCII STL (missing endsolid)
- Large and small models

### 3. Error Handling
- Empty files
- Files that are too small
- Corrupted binary STL (invalid triangle count)
- NULL and undefined buffers
- Files with NaN values
- Files with invalid data

### 4. Volume Calculation
- Accurate volume calculation for cubes of different sizes
- Conversion from mm³ to cm³

### 5. Surface Area Calculation
- Accurate surface area calculation
- Conversion from mm² to cm²

### 6. Bounding Box Calculation
- Correct dimensional calculations
- Conversion from mm to cm

### 7. Print Time Estimation
- Basic print time calculation from volume
- Custom print speed configuration
- Infill percentage adjustments
- Larger volumes = longer print times

### 8. Validation
- Valid STL data validation
- Detection of invalid volume
- Detection of invalid surface area
- Detection of zero triangles
- Detection of invalid bounding boxes
- Warnings for very large models (>100cm)
- Warnings for very small models (<1mm)

### 9. Format Detection
- Automatic detection of binary vs ASCII format
- Edge case: binary files starting with "solid"

### 10. Performance
- Binary STL parsing performance (<100ms)
- ASCII STL parsing performance (<200ms)

## Test Fixtures

The test suite uses programmatically generated STL files:

- **Binary STL Cubes**: Perfect cubes in binary format (various sizes)
- **ASCII STL Cubes**: Perfect cubes in ASCII format (various sizes)
- **Corrupted Files**: Invalid triangle counts, NaN values, etc.
- **Edge Cases**: Files starting with "solid", missing endsolid, etc.

## Expected Test Results

All tests should pass with the following expected values for a 20mm cube:

- **Triangles**: 12 (2 per face × 6 faces)
- **Vertices**: 36 (3 per triangle × 12 triangles)
- **Volume**: 8 cm³ (20mm³ = 8000mm³ = 8cm³)
- **Surface Area**: 24 cm² (2400mm² = 24cm²)
- **Bounding Box**: 2cm × 2cm × 2cm
- **Estimated Print Time**: >0 hours

## Coverage Goals

- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+
- **Statements**: 70%+

## Adding New Tests

To add new test cases:

1. Create test fixtures in `fixtures/stl-generators.ts`
2. Add test cases to `stl-parser.test.ts`
3. Run tests to verify they pass
4. Update this README if adding new test categories

## Known Test Scenarios

### Valid Files
✅ Binary STL cubes (10mm, 20mm, 30mm, 50mm, 100mm)
✅ ASCII STL cubes (10mm, 20mm, 30mm, 50mm, 100mm)
✅ Binary STL with "solid" header

### Invalid Files
✅ Empty files (0 bytes)
✅ Too small files (<84 bytes)
✅ Corrupted triangle count
✅ NaN values in vertices
✅ Invalid vertices in ASCII format
✅ Missing endsolid in ASCII format

### Edge Cases
✅ NULL buffer
✅ Undefined buffer
✅ Very large models (>100cm)
✅ Very small models (<1mm)
✅ Binary files that start with "solid"

## Troubleshooting

If tests fail:

1. Ensure all dependencies are installed: `npm install`
2. Check that Jest is configured correctly (see `jest.config.js`)
3. Verify TypeScript compilation: `npm run type-check`
4. Check individual test output for specific failures
5. Review test fixtures for correctness

## Performance Benchmarks

Expected performance on modern hardware:

- Binary STL (50mm cube): <100ms
- ASCII STL (50mm cube): <200ms
- Validation: <1ms
- Print time calculation: <1ms

## Future Test Improvements

- [ ] Test with real-world STL files
- [ ] Test with very complex models (>100k triangles)
- [ ] Test with malformed binary data
- [ ] Test concurrency (multiple files parsed simultaneously)
- [ ] Test memory usage with large files
- [ ] Integration tests with file upload API
